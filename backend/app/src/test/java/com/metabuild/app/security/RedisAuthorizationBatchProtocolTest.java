package com.metabuild.app.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.metabuild.shared.kernel.UuidV7Generator;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import com.metabuild.shared.kernel.security.DataScopePolicy;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import java.time.Duration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import io.lettuce.core.ClientOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import com.metabuild.modules.admin.auth.application.*;
import com.metabuild.modules.admin.auth.api.AuthorizationRefreshService;
import java.net.ServerSocket;
import java.net.Socket;
import java.io.IOException;
import java.time.Clock;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

class RedisAuthorizationBatchProtocolTest {
    @Test void realRedisPipelinesOneHundredFencesAndReadyCasWithoutRevisionDowngrade() {
        Assumptions.assumeTrue(Boolean.getBoolean("task16.redis.local"));
        var factory=new LettuceConnectionFactory("127.0.0.1",6379);factory.afterPropertiesSet();factory.start();
        var redis=spy(new StringRedisTemplate(factory));redis.afterPropertiesSet();
        var store=new RedisAuthorizationSnapshotStore(redis,new ObjectMapper().findAndRegisterModules());
        var ids=new UuidV7Generator();Map<UUID,AuthorizationSnapshot> old=new LinkedHashMap<>();Map<UUID,Long> targets=new LinkedHashMap<>();
        for(int i=0;i<100;i++){UUID user=ids.generate();var ready=ready(user,4);old.put(user,ready);targets.put(user,5L);assertThat(store.initializeReady(ready)).isTrue();}
        UUID operation=ids.generate();long started=System.nanoTime();assertThat(store.fenceAll(operation,targets,Instant.now())).hasSize(100);
        Map<UUID,AuthorizationSnapshot> next=new LinkedHashMap<>();old.keySet().forEach(u->next.put(u,ready(u,5)));
        assertThat(store.readyAll(operation,next)).isTrue();
        verify(redis,times(2)).executePipelined(any(org.springframework.data.redis.core.RedisCallback.class));
        assertThat(Duration.ofNanos(System.nanoTime()-started)).isLessThan(Duration.ofSeconds(2));
        UUID first=old.keySet().iterator().next();assertThat(store.initializeReady(ready(first,4))).isTrue();assertThat(store.load(first)).isEqualTo(next.get(first));
        old.keySet().forEach(u->redis.delete("authz:"+u));redis.delete("authz:fenced");factory.destroy();
    }
    @Test void realRedisPartialFenceRepliesAreCompensatedAndCandidateScanIsBounded() {
        Assumptions.assumeTrue(Boolean.getBoolean("task16.redis.local"));
        var factory=new LettuceConnectionFactory("127.0.0.1",6379);factory.afterPropertiesSet();factory.start();
        var redis=new StringRedisTemplate(factory);redis.afterPropertiesSet();redis.delete("authz:fenced");
        var store=new RedisAuthorizationSnapshotStore(redis,new ObjectMapper().findAndRegisterModules());var ids=new UuidV7Generator();
        Map<UUID,AuthorizationSnapshot> old=new LinkedHashMap<>();Map<UUID,Long> targets=new LinkedHashMap<>();
        for(int i=0;i<100;i++){UUID user=ids.generate();old.put(user,ready(user,4));targets.put(user,5L);store.initializeReady(old.get(user));}
        UUID missing=old.keySet().iterator().next();redis.delete("authz:"+missing);UUID operation=ids.generate();Instant fencedAt=Instant.now().minusSeconds(120);
        assertThat(store.fenceAll(operation,targets,fencedAt)).hasSize(99);
        store.compensate(operation,old);
        assertThat(store.fencedCandidates(Instant.now(),3)).isEmpty();
        old.keySet().stream().filter(user->!user.equals(missing)).forEach(user->assertThat(store.load(user)).isEqualTo(old.get(user)));
        old.keySet().forEach(user->redis.delete("authz:"+user));redis.delete("authz:fenced");factory.destroy();
    }
    @Test void realTcpDisconnectAfterExecutedPipelineCommandsTriggersExecutorCompensationOnlyForSameOperation() throws Exception {
        Assumptions.assumeTrue(Boolean.getBoolean("task16.redis.local"));
        try(var proxy=new DisconnectingRedisProxy(6379)){
            var directFactory=factory(6379);var directRedis=template(directFactory);directRedis.delete("authz:fenced");
            var proxyFactory=faultFactory(proxy.port());var direct=new RedisAuthorizationSnapshotStore(directRedis,new ObjectMapper().findAndRegisterModules());
            var throughProxy=new RedisAuthorizationSnapshotStore(template(proxyFactory),new ObjectMapper().findAndRegisterModules());
            var ids=new UuidV7Generator();Map<UUID,AuthorizationSnapshot> old=new LinkedHashMap<>();
            for(int i=0;i<20;i++){UUID user=ids.generate();old.put(user,ready(user,4));assertThat(direct.initializeReady(old.get(user))).isTrue();}
            UUID otherUser=ids.generate(),otherOperation=ids.generate();assertThat(direct.initializeReady(ready(otherUser,4))).isTrue();
            assertThat(direct.fenceAll(otherOperation,Map.of(otherUser,5L),Instant.now())).containsExactly(otherUser);
            UUID operation=ids.generate();var port=new SnapshotPort(old);var executor=new AuthorizationCommandExecutor(port,throughProxy,()->operation,Clock.systemUTC());
            proxy.disconnectAfterIntegerReplies(5);
            assertThatThrownBy(()->executor.execute(AuthorizationRefreshService.Cause.ROLE_CHANGED,new AuthorizationRefreshService.AuthorizationChange<>(){
                public Set<UUID> affectedUserIds(){return old.keySet();}public Void mutate(){throw new AssertionError("must not mutate after partial fence");}
            })).isInstanceOf(AuthorizationUnavailable.class);
            for(var entry:old.entrySet())assertThat(direct.load(entry.getKey())).isEqualTo(entry.getValue());
            assertThat(direct.load(otherUser)).isInstanceOf(com.metabuild.shared.kernel.security.AuthorizationFence.class)
                    .extracting(state->((com.metabuild.shared.kernel.security.AuthorizationFence)state).operationId()).isEqualTo(otherOperation);
            assertThat(proxy.disconnections()).isOne();
            old.keySet().forEach(user->directRedis.delete("authz:"+user));directRedis.delete("authz:"+otherUser);directRedis.delete("authz:fenced");
            proxyFactory.destroy();directFactory.destroy();
        }
    }
    @Test void concurrentLoginInitializeCannotOverwriteFenceOrPublishLowRevision() throws Exception {
        Assumptions.assumeTrue(Boolean.getBoolean("task16.redis.local"));var factory=factory(6379);var redis=template(factory);var store=new RedisAuthorizationSnapshotStore(redis,new ObjectMapper().findAndRegisterModules());var ids=new UuidV7Generator();
        for(int round=0;round<25;round++){UUID user=ids.generate(),operation=ids.generate();assertThat(store.initializeReady(ready(user,4))).isTrue();var gate=new CountDownLatch(1);
            try(var pool=Executors.newFixedThreadPool(2)){var login=pool.submit(()->{gate.await();return store.initializeReady(ready(user,4));});var fence=pool.submit(()->{gate.await();return store.fenceAll(operation,Map.of(user,5L),Instant.now());});gate.countDown();login.get();assertThat(fence.get()).containsExactly(user);}
            assertThat(store.load(user)).isInstanceOf(com.metabuild.shared.kernel.security.AuthorizationFence.class).satisfies(state->assertThat(((com.metabuild.shared.kernel.security.AuthorizationFence)state).targetRevision()).isEqualTo(5));redis.delete("authz:"+user);
        }
        redis.delete("authz:fenced");factory.destroy();
    }
    private static LettuceConnectionFactory factory(int port){var factory=new LettuceConnectionFactory("127.0.0.1",port);factory.afterPropertiesSet();factory.start();return factory;}
    private static LettuceConnectionFactory faultFactory(int port){var server=new RedisStandaloneConfiguration("127.0.0.1",port);var client=LettuceClientConfiguration.builder().clientOptions(ClientOptions.builder().autoReconnect(false).build()).build();var factory=new LettuceConnectionFactory(server,client);factory.setShareNativeConnection(false);factory.afterPropertiesSet();factory.start();return factory;}
    private static StringRedisTemplate template(LettuceConnectionFactory factory){var redis=new StringRedisTemplate(factory);redis.afterPropertiesSet();return redis;}
    private static final class SnapshotPort implements AuthorizationRefreshPort {
        final Map<UUID,AuthorizationSnapshot> snapshots;SnapshotPort(Map<UUID,AuthorizationSnapshot> snapshots){this.snapshots=Map.copyOf(snapshots);}
        public <T>T inTransaction(TransactionWork<T> work){return work.run();}public void lockAuthzGraph(){}
        public Map<UUID,Long> revisions(Set<UUID> users){var result=new LinkedHashMap<UUID,Long>();users.forEach(user->result.put(user,4L));return result;}
        public Map<UUID,Long> incrementRevisions(Set<UUID> users){throw new AssertionError();}
        public void appendRefreshOutbox(UUID op,Map<UUID,Long> r,AuthorizationRefreshService.Cause c){throw new AssertionError();}
        public void appendTerminalOutbox(UUID op,Map<UUID,Long> r,AuthorizationRefreshService.TerminalAction a){throw new AssertionError();}
        public Map<UUID,AuthorizationSnapshot> compileSnapshots(Set<UUID> users){var result=new LinkedHashMap<UUID,AuthorizationSnapshot>();users.forEach(user->result.put(user,snapshots.get(user)));return result;}
        public void markDone(UUID op,Set<UUID> users){throw new AssertionError();}
    }
    private static final class DisconnectingRedisProxy implements AutoCloseable {
        private static final byte[] INTEGER_ONE=":1\r\n".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        private final ServerSocket listener;private final AtomicBoolean running=new AtomicBoolean(true),armed=new AtomicBoolean();
        private final AtomicInteger threshold=new AtomicInteger(),seen=new AtomicInteger(),disconnects=new AtomicInteger();
        DisconnectingRedisProxy(int upstreamPort)throws IOException{listener=new ServerSocket(0);Thread.startVirtualThread(()->accept(upstreamPort));}
        int port(){return listener.getLocalPort();}int disconnections(){return disconnects.get();}
        void disconnectAfterIntegerReplies(int replies){seen.set(0);threshold.set(replies);armed.set(true);}
        private void accept(int upstreamPort){while(running.get())try{Socket client=listener.accept();Socket upstream=new Socket("127.0.0.1",upstreamPort);Thread.startVirtualThread(()->copy(client,upstream,false));Thread.startVirtualThread(()->copy(upstream,client,true));}catch(IOException ignored){if(running.get())throw new RuntimeException(ignored);}}
        private void copy(Socket source,Socket target,boolean responses){try(source;target){var in=source.getInputStream();var out=target.getOutputStream();int matched=0,value;while((value=in.read())!=-1){out.write(value);out.flush();if(responses&&armed.get()){matched=value==INTEGER_ONE[matched]?matched+1:(value==INTEGER_ONE[0]?1:0);if(matched==INTEGER_ONE.length){matched=0;if(seen.incrementAndGet()>=threshold.get()&&armed.compareAndSet(true,false)){disconnects.incrementAndGet();return;}}}}}catch(IOException ignored){}}
        public void close()throws IOException{running.set(false);listener.close();}
    }
    private static AuthorizationSnapshot ready(UUID user,long revision){return new AuthorizationSnapshot(user,revision,false,Set.of(),Set.of(),new DataScopePolicy(false,false,Set.of()),Instant.EPOCH);}
}
