package com.metabuild.infrastructure.jooq;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.jooq.impl.DSL;
import org.jooq.impl.SQLDataType;
import org.junit.jupiter.api.Test;

class DataScopeRegistryVerifierTest {
    @Test void rejectsGeneratedTableMissingFromRegistry() {
        var table = DSL.table("orders");
        var verifier = new DataScopeRegistryVerifier(new DataScopeRegistry(List.of()), List.of(table));
        assertThatThrownBy(verifier::afterPropertiesSet).hasMessageContaining("orders");
    }

    @Test void rejectsMissingAndNonUuidScopeColumns() {
        var missing = DSL.table("orders").as("orders");
        var missingRegistry = new DataScopeRegistry(List.of(new DataScopeRegistry.Scoped("orders", "owner_dept_id", "created_by", com.metabuild.infrastructure.jooq.persistence.scoped.TestScopedOwner.class)));
        assertThatThrownBy(() -> new DataScopeRegistryVerifier(missingRegistry, List.of(missing)).afterPropertiesSet())
                .hasMessageContaining("owner_dept_id");

        var wrong = DSL.select(
                DSL.field(DSL.name("owner_dept_id"), SQLDataType.BIGINT).as("owner_dept_id"),
                DSL.field(DSL.name("created_by"), SQLDataType.UUID).as("created_by")).asTable("orders");
        assertThatThrownBy(() -> new DataScopeRegistryVerifier(missingRegistry, List.of(wrong)).afterPropertiesSet())
                .hasMessageContaining("must be UUID");
    }

    @Test void rejectsRegistryEntriesThatDoNotExistInGeneratedSchemas() {
        var table = DSL.table("known");
        var registry = new DataScopeRegistry(List.of(
                new DataScopeRegistry.Whitelisted("known", "system"),
                new DataScopeRegistry.Whitelisted("ghost", "system")));
        assertThatThrownBy(() -> new DataScopeRegistryVerifier(registry, List.of(table)).afterPropertiesSet())
                .hasMessageContaining("ghost");
    }
}
