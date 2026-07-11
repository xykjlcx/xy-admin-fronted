package com.metabuild.app.architecture.external;
public final class RawExternalHelper {
    public static Object query(org.jooq.DSLContext dsl,String sql){return dsl.fetch(sql);}
}
