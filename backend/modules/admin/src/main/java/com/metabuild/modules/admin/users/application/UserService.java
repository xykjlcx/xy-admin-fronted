package com.metabuild.modules.admin.users.application;

import com.metabuild.modules.admin.auth.api.AuthorizationRefreshService;
import com.metabuild.shared.kernel.BadRequest;
import com.metabuild.shared.kernel.NotFound;
import com.metabuild.shared.kernel.PageResult;
import java.util.Set;
import java.util.UUID;

public final class UserService {
    private final UserRepository users;
    private final AuthorizationRefreshService refresh;
    public UserService(UserRepository users, AuthorizationRefreshService refresh) { this.users=users; this.refresh=refresh; }
    public PageResult<UserView> search(int p,int s,String status,UUID dept,boolean direct,String q) {
        if (p < 1 || s < 1 || s > 200) throw new BadRequest(() -> "iam.user.page-invalid", "Invalid pagination");
        return users.search(p,s,status,dept,direct,q);
    }
    public UserView detail(UUID id) { return users.find(id).orElseThrow(() -> new NotFound(() -> "iam.user.not-found", "User not found")); }
    public UserView create(UUID id,String name,UUID dept,String role,String phone,String email) { return refresh.execute(AuthorizationRefreshService.Cause.USER_CHANGED,change(Set.of(id),()->users.create(id,name,dept,role,phone,email))); }
    public UserView update(UUID id,UserPatch patch) {
        return refresh.execute(AuthorizationRefreshService.Cause.USER_CHANGED, change(Set.of(id), () -> users.update(id,patch)));
    }
    public void delete(UUID id) { refresh.executeTerminal(terminal(Set.of(id), AuthorizationRefreshService.TerminalAction.DELETE_ACCOUNT, () -> { if(users.softDelete(id).isEmpty())throw new NotFound(()->"iam.user.not-found","User not found"); return null; })); }
    public int disable(Set<UUID> ids) { return refresh.executeTerminal(terminal(ids, AuthorizationRefreshService.TerminalAction.DISABLE_ACCOUNT, () -> users.disable(ids).size())); }
    public int move(Set<UUID> ids,UUID dept) { return refresh.execute(AuthorizationRefreshService.Cause.DEPARTMENT_CHANGED, change(ids, () -> users.moveToDepartment(ids,dept).size())); }
    private static <T> AuthorizationRefreshService.AuthorizationChange<T> change(Set<UUID> ids, java.util.function.Supplier<T> mutation){return new AuthorizationRefreshService.AuthorizationChange<>(){public Set<UUID> affectedUserIds(){return Set.copyOf(ids);}public T mutate(){return mutation.get();}};}
    private static <T> AuthorizationRefreshService.TerminalChange<T> terminal(Set<UUID> ids,AuthorizationRefreshService.TerminalAction action,java.util.function.Supplier<T> mutation){return new AuthorizationRefreshService.TerminalChange<>(){public Set<UUID> affectedUserIds(){return Set.copyOf(ids);}public T mutate(){return mutation.get();}public AuthorizationRefreshService.TerminalAction terminalAction(){return action;}};}
}
