package com.metabuild.modules.admin.profile.persistence;

import com.metabuild.modules.admin.profile.application.*;
import com.metabuild.shared.kernel.NotFound;
import com.metabuild.shared.kernel.UuidV7Generator;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.impl.DSL;

public final class JooqProfileRepository implements ProfileRepository {
    private final DSLContext db;
    private final UuidV7Generator ids = new UuidV7Generator();

    public JooqProfileRepository(DSLContext db) { this.db = db; }

    @Override
    public ProfileView get(UUID id) {
        ensure(id);
        Record row = db.fetchOne("""
                select u.id,u.display_name,u.email,coalesce(u.phone,'') phone,
                       coalesce(c.name,'') company,coalesce(d.name,'') department,
                       coalesce(string_agg(ro.name,',' order by ro.name),'') role,
                       p.location,p.employee_no,p.title,p.joined_date,p.manager_name,
                       p.language,p.timezone,p.bio,p.email_verified,u.updated_at
                from mb_user u
                join mb_user_profile p on p.user_id=u.id
                left join mb_dept d on d.id=u.dept_id
                left join mb_user_role ur on ur.user_id=u.id
                left join mb_role ro on ro.id=ur.role_id
                left join mb_company c on c.singleton_key=1
                where u.id=? and u.deleted_at is null
                group by u.id,c.name,d.name,p.user_id
                """, id);
        if (row == null) throw missing();
        return new ProfileView(id,
                row.get("display_name", String.class), Objects.toString(row.get("email", String.class), ""),
                row.get("phone", String.class), row.get("company", String.class),
                row.get("department", String.class), row.get("role", String.class),
                row.get("location", String.class), row.get("employee_no", String.class),
                row.get("title", String.class), Objects.toString(row.get("joined_date", LocalDate.class), ""),
                row.get("manager_name", String.class), row.get("language", String.class),
                row.get("timezone", String.class), row.get("bio", String.class),
                Boolean.TRUE.equals(row.get("email_verified", Boolean.class)),
                row.get("updated_at", OffsetDateTime.class).toInstant().toString());
    }

    @Override
    public ProfileView update(UUID id, ProfileUpdate value) {
        ensure(id);
        db.transaction(configuration -> {
            DSLContext tx = DSL.using(configuration);
            if (tx.execute("update mb_user set display_name=?,phone=?,updated_at=current_timestamp where id=? and deleted_at is null",
                    value.name().trim(), value.phone().trim(), id) == 0) throw missing();
            if (tx.execute("update mb_user_profile set location=?,title=?,language=?,timezone=?,bio=?,updated_at=current_timestamp where user_id=?",
                    value.location().trim(), value.title().trim(), value.language().trim(),
                    value.timezone().trim(), value.bio().trim(), id) == 0) throw missing();
        });
        return get(id);
    }

    @Override public SecuritySettings security(UUID id) {
        ensure(id);
        Record row = db.fetchOne("select two_factor,email_alert,new_device_alert from mb_user_profile where user_id=?", id);
        return new SecuritySettings(row.get("two_factor", Boolean.class), row.get("email_alert", Boolean.class),
                row.get("new_device_alert", Boolean.class));
    }

    @Override public SecuritySettings updateSecurity(UUID id, SecuritySettings value) {
        ensure(id);
        db.execute("update mb_user_profile set two_factor=?,email_alert=?,new_device_alert=?,updated_at=current_timestamp where user_id=?",
                value.twoFactor(), value.emailAlert(), value.newDeviceAlert(), id);
        return security(id);
    }

    @Override public PreferenceView preferences(UUID id) {
        ensure(id);
        Record row = db.fetchOne("select language,timezone,weekly_digest,compact_notifications from mb_user_profile where user_id=?", id);
        return new PreferenceView(row.get("language", String.class), row.get("timezone", String.class),
                row.get("weekly_digest", Boolean.class), row.get("compact_notifications", Boolean.class));
    }

    @Override public PreferenceView updatePreferences(UUID id, PreferenceView value) {
        ensure(id);
        db.execute("update mb_user_profile set language=?,timezone=?,weekly_digest=?,compact_notifications=?,updated_at=current_timestamp where user_id=?",
                value.language(), value.timezone().trim(), value.weeklyDigest(), value.compactNotifications(), id);
        return preferences(id);
    }

    @Override
    public PasswordChange changePasswordWithRecovery(UUID id, String current, String replacement,
            String protectedSessionId, UUID workerId, Duration lease, PasswordCodec passwords) {
        return db.transactionResult(configuration -> {
            DSLContext tx = DSL.using(configuration);
            Record row = tx.fetchOne("select password_hash,credential_revision from mb_user where id=? and deleted_at is null for update", id);
            if (row == null) throw missing();
            if (!passwords.matches(current, row.get("password_hash", String.class))) {
                return new PasswordChange(false, null);
            }
            long revision = row.get("credential_revision", Long.class) + 1;
            UUID event = ids.generate();
            tx.execute("update mb_user set password_hash=?,credential_revision=?,updated_at=current_timestamp where id=?",
                    passwords.hash(replacement), revision, id);
            tx.execute("""
                    insert into mb_credential_revocation_outbox(
                        id,user_id,credential_revision,protected_session_id,status,attempts,
                        worker_id,claimed_at,lease_until,next_attempt_at)
                    values(?,?,?,?,'PROCESSING',1,?,current_timestamp,
                        current_timestamp+(? * interval '1 millisecond'),current_timestamp)
                    """, event, id, revision, protectedSessionId, workerId, lease.toMillis());
            return new PasswordChange(true,
                    new CredentialRevocation(event, id, protectedSessionId, revision, workerId, 1));
        });
    }

    @Override
    public List<CredentialRevocation> claimCredentialRevocations(UUID workerId, int limit, Duration lease) {
        if (limit < 1 || limit > 500) throw new IllegalArgumentException("bounded claim required");
        return db.transactionResult(configuration -> {
            DSLContext tx = DSL.using(configuration);
            return tx.fetch("""
                    with picked as (
                        select id
                        from mb_credential_revocation_outbox
                        where (status in ('PENDING','FAILED') and next_attempt_at<=current_timestamp)
                           or (status='PROCESSING' and lease_until<current_timestamp)
                        order by next_attempt_at,id
                        for update skip locked
                        limit ?
                    ), claimed as (
                        update mb_credential_revocation_outbox o
                        set status='PROCESSING',worker_id=?,claimed_at=current_timestamp,
                            lease_until=current_timestamp+(? * interval '1 millisecond'),attempts=attempts+1
                        from picked
                        where o.id=picked.id
                        returning o.id,o.user_id,o.protected_session_id,o.credential_revision,o.attempts
                    )
                    select * from claimed
                    """, limit, workerId, lease.toMillis())
                    .map(row -> credentialRevocation(row, workerId));
        });
    }

    private static CredentialRevocation credentialRevocation(Record row, UUID workerId) {
        return new CredentialRevocation(row.get("id", UUID.class), row.get("user_id", UUID.class),
                row.get("protected_session_id", String.class), row.get("credential_revision", Long.class),
                workerId, row.get("attempts", Integer.class));
    }

    @Override public boolean completeCredentialRevocation(CredentialRevocation task) {
        return db.execute("""
                update mb_credential_revocation_outbox
                set status='DONE',worker_id=null,claimed_at=null,lease_until=null,
                    processed_at=current_timestamp,last_error=null
                where id=? and status='PROCESSING' and worker_id=? and attempts=?
                """, task.id(), task.workerId(), task.attempt()) == 1;
    }

    @Override public boolean failCredentialRevocation(CredentialRevocation task, String error) {
        return db.execute("""
                update mb_credential_revocation_outbox
                set status='FAILED',worker_id=null,claimed_at=null,lease_until=null,
                    last_error=?,next_attempt_at=current_timestamp+interval '5 seconds'
                where id=? and status='PROCESSING' and worker_id=? and attempts=?
                """, error, task.id(), task.workerId(), task.attempt()) == 1;
    }

    private void ensure(UUID id) {
        db.execute("insert into mb_user_profile(user_id,location,title,bio) select id,'Unknown','User','Profile' from mb_user where id=? and deleted_at is null on conflict(user_id) do nothing", id);
    }

    private static NotFound missing() { return new NotFound(() -> "profile.not-found", "Profile not found"); }
}
