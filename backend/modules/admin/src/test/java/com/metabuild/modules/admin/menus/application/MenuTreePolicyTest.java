package com.metabuild.modules.admin.menus.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MenuTreePolicyTest {
    private static final UUID ROOT = UUID.fromString("01900000-0000-7000-8000-000000000201");
    private static final UUID PAGE = UUID.fromString("01900000-0000-7000-8000-000000000202");

    @Test
    void retainsVisibleParentOnlyWhenAnAuthorizedDescendantSurvives() {
        var rows = List.of(
                MenuRow.directory(ROOT, null, "admin", "nav.org", "users", 1, true),
                MenuRow.page(PAGE, ROOT, "admin", "nav.users", null, 1, true,
                        "/admin/users", "iam:user:view"));

        assertThat(MenuTreePolicy.visible(rows, Set.of("iam:user:view"), false))
                .extracting(MenuItem::id).containsExactly(ROOT, PAGE);
        assertThat(MenuTreePolicy.visible(rows, Set.of(), false)).isEmpty();
    }

    @Test
    void rejectsHiddenDeprecatedAndUnauthorizedLeaves() {
        var hidden = MenuRow.page(PAGE, null, "admin", "nav.users", null, 1, false,
                "/admin/users", "iam:user:view");
        assertThat(MenuTreePolicy.visible(List.of(hidden), Set.of("iam:user:view"), false)).isEmpty();
    }

    @Test
    void rejectsLeavesWithMissingOrHiddenAncestors() {
        var missing = MenuRow.page(PAGE, ROOT, "admin", "nav.users", null, 1, true,
                "/admin/users", "iam:user:view");
        assertThat(MenuTreePolicy.visible(List.of(missing), Set.of("iam:user:view"), false)).isEmpty();
        var hiddenParent = MenuRow.directory(ROOT, null, "admin", "nav.org", "users", 1, false);
        assertThat(MenuTreePolicy.visible(List.of(hiddenParent, missing), Set.of("iam:user:view"), false)).isEmpty();
    }
}
