package com.metabuild.modules.admin.task20;

import static org.assertj.core.api.Assertions.*;
import com.metabuild.modules.admin.profile.application.*;
import java.time.Duration;
import java.util.*;
import org.junit.jupiter.api.Test;

class CredentialRevocationRecoveryTest {
    @Test void committedPasswordChangeRemainsDiscoverableAndRetriesAfterSessionFailure() {
        UUID user=UUID.fromString("01900000-0000-7000-8000-000000000010"), event=UUID.fromString("01900000-0000-7000-8000-000000000099");
        var repository=new RecoveryRepository(user,event);var sessions=new FailingOnceSessions();
        var service=new ProfileService(repository,sessions,new PasswordCodec(){public String hash(String raw){return raw;}public boolean matches(String raw,String encoded){return true;}});
        assertThatThrownBy(()->service.changePassword(user,"old-password","new-password")).isInstanceOf(IllegalStateException.class);
        assertThat(repository.failed).isTrue();assertThat(repository.done).isFalse();
        assertThat(service.reconcileCredentialRevocations(100)).isOne();
        assertThat(repository.done).isTrue();assertThat(sessions.calls).isEqualTo(2);
        assertThat(sessions.protectedSessions).containsOnly("current-session");
    }

    @Test void expiredWorkerCannotCompleteOrFailAReclaimedCredentialTask() {
        UUID user=UUID.fromString("01900000-0000-7000-8000-000000000010");
        UUID event=UUID.fromString("01900000-0000-7000-8000-000000000099");
        UUID staleWorker=UUID.fromString("01900000-0000-7000-8000-000000000101");
        UUID currentWorker=UUID.fromString("01900000-0000-7000-8000-000000000102");
        var repository=new RecoveryRepository(user,event);
        var stale=new ProfileRepository.CredentialRevocation(event,user,"current-session",2L,staleWorker,1);
        var current=new ProfileRepository.CredentialRevocation(event,user,"current-session",2L,currentWorker,2);
        repository.leased=current;

        assertThat(repository.completeCredentialRevocation(stale)).isFalse();
        assertThat(repository.failCredentialRevocation(stale,"late worker")).isFalse();
        assertThat(repository.completeCredentialRevocation(current)).isTrue();
    }
    private static final class RecoveryRepository implements ProfileRepository {
        final UUID user,event;boolean pending,failed,done;CredentialRevocation leased;RecoveryRepository(UUID user,UUID event){this.user=user;this.event=event;}
        public PasswordChange changePasswordWithRecovery(UUID id,String c,String n,String protectedSessionId,UUID worker,Duration lease,PasswordCodec p){assertThat(protectedSessionId).isEqualTo("current-session");leased=new CredentialRevocation(event,user,"current-session",2L,worker,1);return new PasswordChange(true,leased);}
        public List<CredentialRevocation> claimCredentialRevocations(UUID worker,int limit,Duration lease){if(leased!=null)return List.of(leased);return (pending||failed)&&!done?List.of(new CredentialRevocation(event,user,"current-session",2L,worker,1)):List.of();}
        public boolean completeCredentialRevocation(CredentialRevocation task){if(leased!=null&&(task.attempt()!=leased.attempt()||!task.workerId().equals(leased.workerId())))return false;done=true;pending=false;failed=false;return true;}public boolean failCredentialRevocation(CredentialRevocation task,String error){if(leased!=null&&(task.attempt()!=leased.attempt()||!task.workerId().equals(leased.workerId())))return false;pending=false;failed=true;leased=null;return true;}
        public ProfileView get(UUID id){throw new UnsupportedOperationException();}public ProfileView update(UUID id,ProfileUpdate x){throw new UnsupportedOperationException();}public SecuritySettings security(UUID id){throw new UnsupportedOperationException();}public SecuritySettings updateSecurity(UUID id,SecuritySettings x){throw new UnsupportedOperationException();}public PreferenceView preferences(UUID id){throw new UnsupportedOperationException();}public PreferenceView updatePreferences(UUID id,PreferenceView x){throw new UnsupportedOperationException();}
    }
    private static final class FailingOnceSessions implements ProfileSessionPort {int calls;List<String> protectedSessions=new ArrayList<>();public String currentSessionId(){return "current-session";}public List<LoginDeviceView> devices(UUID id){return List.of();}public void revoke(UUID u,String id){}public void credentialsChanged(UUID id,String protectedSessionId,long targetRevision){assertThat(targetRevision).isEqualTo(2L);protectedSessions.add(protectedSessionId);if(calls++==0)throw new IllegalStateException("redis unavailable");}}
}
