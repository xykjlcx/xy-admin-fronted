package com.metabuild.app.architecture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.metabuild.shared.kernel.security.DataScopedPersistence;
import java.io.InputStream;
import java.util.HashSet;
import java.util.Set;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** 编译后守卫：扫描 scoped owner 及其 helper 的 classfile 常量池，不依赖源码文本/文件名/列名。 */
class DataScopeRepositoryBytecodeGuard {
    private static final Set<String> FORBIDDEN_TYPES = Set.of(
            "org/springframework/jdbc/core/JdbcTemplate", "NamedParameterJdbcTemplate");

    @Test void acceptsTypedGeneratedDslOwnerAndQueryTerminalOperations() {
        assertThatCode(() -> verify(SafeOwner.class)).doesNotThrowAnyException();
        assertThatCode(() -> verify(TypedQueryOwner.class)).doesNotThrowAnyException();
    }

    @Test void verifiesEveryProductionScopedOwnerDiscoveredFromBytecode() throws Exception {
        var classes = new com.tngtech.archunit.core.importer.ClassFileImporter()
                .importPackages("com.metabuild.modules");
        for (var javaClass : classes) if (javaClass.isAnnotatedWith(DataScopedPersistence.class)) {
            Class<?> owner=Class.forName(javaClass.getName());
            assertThat(owner.getPackageName()).contains(".persistence.scoped");
            verify(owner);
        }
    }

    @Test void rejectsJdbcNamedJdbcRawSqlVariableConnectionParserDslSqlAndDelegatedHelper() {
        for (Class<?> fixture : Set.of(JdbcOwner.class, NamedJdbcOwner.class, RawFetchOwner.class,
                ConnectionOwner.class, ParserOwner.class, DslSqlOwner.class, DelegatingOwner.class,
                ExternalStaticOwner.class, ReturnHelperOwner.class)) {
            Throwable failure=org.assertj.core.api.Assertions.catchThrowable(() -> verify(fixture));
            assertThat(failure).as(fixture.getSimpleName()).isInstanceOf(AssertionError.class);
        }
    }

    static void verify(Class<?> owner) { verify(owner, owner.getPackageName(), new HashSet<>()); }

    private static void verify(Class<?> type, String controlledPackage, Set<Class<?>> seen) {
        if (!seen.add(type)) return;
        assertThat(type.getPackageName()).as("scoped helper package").isEqualTo(controlledPackage);
        String pool = constantPool(type);
        for (String forbidden : FORBIDDEN_TYPES) assertThat(pool).as(type.getName()+" forbids "+forbidden).doesNotContain(forbidden);
        for (var field : type.getDeclaredFields()) {
            Class<?> helper=field.getType();
            if (helper.getPackageName().equals(controlledPackage) && !helper.getName().startsWith("java.")) verify(helper,controlledPackage,seen);
        }
        for(var method:type.getDeclaredMethods()){
            verifyHelperType(method.getReturnType(),controlledPackage,seen);
            for(Class<?> parameter:method.getParameterTypes())verifyHelperType(parameter,controlledPackage,seen);
        }
        var imported=new com.tngtech.archunit.core.importer.ClassFileImporter().importPackages("com.metabuild");
        for(var call:imported.get(type).getMethodCallsFromSelf()){
            var target=call.getTarget();
            String owner=target.getOwner().getName();String name=target.getName();
            boolean stringFirst=!target.getRawParameterTypes().isEmpty()
                    && target.getRawParameterTypes().get(0).isEquivalentTo(String.class);
            boolean plain=target.isAnnotatedWith("org.jooq.PlainSQL")
                    || (owner.equals("org.jooq.DSLContext") && (name.equals("connection")||name.equals("parser")))
                    || (owner.equals("org.jooq.DSLContext") && Set.of("fetch","resultQuery","query","execute").contains(name) && stringFirst)
                    || (owner.equals("org.jooq.impl.DSL") && name.equals("sql") && stringFirst);
            assertThat(plain).as("raw jOOQ call forbidden: "+target.getFullName()).isFalse();
        }
        for(var dependency:imported.get(type).getDirectDependenciesFromSelf()){
            String target=dependency.getTargetClass().getName();
            String targetPackage=dependency.getTargetClass().getPackageName();
            if(target.startsWith("com.metabuild")&&!target.startsWith("com.metabuild.schema")
                    && !target.startsWith("com.metabuild.shared")&&!targetPackage.equals(controlledPackage)){
                throw new AssertionError("Scoped persistence depends on helper outside controlled package: "+target);
            }
        }
    }

    private static void verifyHelperType(Class<?> helper,String controlledPackage,Set<Class<?>> seen){
        if(helper.getName().startsWith("com.metabuild")&&!helper.getPackageName().equals(controlledPackage)
                && !helper.getName().startsWith("com.metabuild.schema")&&!helper.getName().startsWith("com.metabuild.shared"))
            throw new AssertionError("Scoped helper outside controlled package: "+helper.getName());
        if(helper.getPackageName().equals(controlledPackage))verify(helper,controlledPackage,seen);
    }

    private static String constantPool(Class<?> type) {
        String resource="/"+type.getName().replace('.','/')+".class";
        try(InputStream in=type.getResourceAsStream(resource)){return new String(in.readAllBytes(),java.nio.charset.StandardCharsets.ISO_8859_1);}
        catch(Exception failure){throw new IllegalStateException(failure);}
    }

    @DataScopedPersistence(tables="safe") static class SafeOwner { DSLContext dsl; Object q(){return dsl.selectOne();} }
    @DataScopedPersistence(tables="typed") static class TypedQueryOwner {
        DSLContext dsl;
        Object list(){return dsl.selectFrom(com.metabuild.schema.platform.tables.MbUser.MB_USER).fetch();}
        Object one(){return dsl.selectFrom(com.metabuild.schema.platform.tables.MbUser.MB_USER).fetchOne();}
        int insert(){return dsl.insertInto(com.metabuild.schema.platform.tables.MbUser.MB_USER)
                .set(com.metabuild.schema.platform.tables.MbUser.MB_USER.USERNAME,"typed").execute();}
        int update(){return dsl.update(com.metabuild.schema.platform.tables.MbUser.MB_USER)
                .set(com.metabuild.schema.platform.tables.MbUser.MB_USER.DISPLAY_NAME,"typed")
                .where(com.metabuild.schema.platform.tables.MbUser.MB_USER.ID.isNotNull()).execute();}
    }
    @DataScopedPersistence(tables="jdbc") static class JdbcOwner { JdbcTemplate jdbc; }
    @DataScopedPersistence(tables="named") static class NamedJdbcOwner { NamedParameterJdbcTemplate jdbc; }
    @DataScopedPersistence(tables="raw") static class RawFetchOwner { DSLContext dsl; String sql; Object q(){return dsl.fetch(sql);} }
    @DataScopedPersistence(tables="connection") static class ConnectionOwner { DSLContext dsl; void q(){dsl.connection(c->{});} }
    @DataScopedPersistence(tables="parser") static class ParserOwner { DSLContext dsl; Object q(){return dsl.parser();} }
    @DataScopedPersistence(tables="sql") static class DslSqlOwner { Object q(){return DSL.sql("select 1");} }
    @DataScopedPersistence(tables="helper") static class DelegatingOwner { RawSqlHelper helper; }
    @DataScopedPersistence(tables="external") static class ExternalStaticOwner { Object q(DSLContext d,String s){return com.metabuild.app.architecture.external.RawExternalHelper.query(d,s);} }
    @DataScopedPersistence(tables="return") static class ReturnHelperOwner { com.metabuild.app.architecture.external.RawExternalHelper q(){return null;} }
    static class RawSqlHelper { DSLContext dsl; String sql; Object q(){return dsl.resultQuery(sql);} }
}
