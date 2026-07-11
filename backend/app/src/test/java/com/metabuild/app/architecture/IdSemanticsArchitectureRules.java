package com.metabuild.app.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaConstructor;
import com.tngtech.archunit.core.domain.JavaField;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.domain.JavaParameter;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.CompositeArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

final class IdSemanticsArchitectureRules {

    private static final String PATH_VARIABLE =
            "org.springframework.web.bind.annotation.PathVariable";
    private static final String CONTROLLER =
            "org.springframework.stereotype.Controller";
    private static final String REST_CONTROLLER =
            "org.springframework.web.bind.annotation.RestController";

    static final ArchRule PERSISTENT_IDS_USE_UUID = classes()
            .should(new ArchCondition<>("use UUID for persistent ID fields") {
                @Override
                public void check(JavaClass javaClass, ConditionEvents events) {
                    String packageName = javaClass.getPackageName();
                    boolean persistentType = packageName.endsWith(".persistence")
                            || packageName.contains(".persistence.")
                            || packageName.startsWith("com.metabuild.schema.")
                            || packageName.startsWith("com.metabuild.modules.");
                    if (!persistentType) {
                        return;
                    }
                    checkSemanticIdFields(javaClass, events, "persistent");
                }
            })
            .as("persistent ID fields use UUID");

    static final ArchRule PATH_IDS_USE_UUID = classes()
            .should(new ArchCondition<>("use UUID for API path variables") {
                @Override
                public void check(JavaClass javaClass, ConditionEvents events) {
                    javaClass.getCodeUnits().forEach(codeUnit -> codeUnit.getParameters().forEach(parameter -> {
                        if (parameter.isAnnotatedWith(PATH_VARIABLE)
                                && isSemanticIdName(pathVariableName(parameter))
                                && !isUuid(parameter.getRawType())) {
                            events.add(SimpleConditionEvent.violated(
                                    parameter,
                                    javaClass.getName() + " declares a non-UUID @PathVariable in "
                                            + codeUnit.getFullName()));
                        }
                    }));
                }
            })
            .as("API path IDs use UUID");

    static final ArchRule CURRENT_USER_IDS_USE_UUID = classes()
            .should(new ArchCondition<>("use UUID for CurrentUser identifiers") {
                @Override
                public void check(JavaClass javaClass, ConditionEvents events) {
                    if (javaClass.getSimpleName().equals("CurrentUser")) {
                        checkSemanticIdFields(javaClass, events, "CurrentUser");
                    }
                }
            })
            .as("CurrentUser IDs use UUID");

    static final ArchRule API_RECORD_IDS_USE_UUID = classes()
            .should(new ArchCondition<>("use UUID for API identifiers") {
                @Override
                public void check(JavaClass javaClass, ConditionEvents events) {
                    if (isApiBoundary(javaClass)) {
                        checkSemanticIdFields(javaClass, events, "API");
                        checkSemanticIdParameters(javaClass, events, "API");
                        checkSemanticIdMethods(javaClass, events, "API");
                        checkReferencedApiTypes(javaClass, events);
                    }
                }
            })
            .as("API IDs use UUID");

    static final ArchRule ALL_ID_TYPES_USE_UUID = CompositeArchRule.of(PERSISTENT_IDS_USE_UUID)
            .and(PATH_IDS_USE_UUID)
            .and(CURRENT_USER_IDS_USE_UUID)
            .and(API_RECORD_IDS_USE_UUID)
            .as("persistent, path, current-user, and API IDs use UUID");

    private IdSemanticsArchitectureRules() {}

    private static void checkSemanticIdFields(
            JavaClass javaClass, ConditionEvents events, String boundary) {
        javaClass.getFields().stream()
                .filter(field -> isSemanticIdName(field.getName()))
                .filter(field -> !involvesUuid(field))
                .forEach(field -> events.add(SimpleConditionEvent.violated(
                        field,
                        javaClass.getName() + "." + field.getName()
                                + " must use UUID for a " + boundary + " ID")));
    }

    private static void checkSemanticIdParameters(
            JavaClass javaClass, ConditionEvents events, String boundary) {
        javaClass.getCodeUnits().forEach(codeUnit -> codeUnit.getParameters().forEach(parameter -> {
            String parameterName = reflectedParameterName(parameter);
            if (isSemanticIdName(parameterName)
                    && parameter.getType().getAllInvolvedRawTypes().stream().noneMatch(
                            IdSemanticsArchitectureRules::isUuid)) {
                events.add(SimpleConditionEvent.violated(
                        parameter,
                        javaClass.getName() + " declares a non-UUID " + boundary
                                + " ID parameter " + parameterName + " in " + codeUnit.getFullName()));
            }
        }));
    }

    private static void checkSemanticIdMethods(
            JavaClass javaClass, ConditionEvents events, String boundary) {
        javaClass.getMethods().stream()
                .filter(method -> isSemanticIdName(method.getName()))
                .filter(method -> method.getReturnType().getAllInvolvedRawTypes().stream()
                        .noneMatch(IdSemanticsArchitectureRules::isUuid))
                .forEach(method -> events.add(SimpleConditionEvent.violated(
                        method,
                        method.getFullName() + " must return UUID for a " + boundary + " ID")));
    }

    private static void checkReferencedApiTypes(JavaClass javaClass, ConditionEvents events) {
        Set<String> visited = new HashSet<>();
        if (!isControllerBoundary(javaClass)) {
            javaClass.getFields().forEach(field -> field.getAllInvolvedRawTypes().stream()
                    .filter(IdSemanticsArchitectureRules::isMetaBuildType)
                    .forEach(type -> checkApiTypeGraph(type, events, visited)));
        }
        javaClass.getCodeUnits().forEach(codeUnit -> codeUnit.getParameters().forEach(parameter ->
                parameter.getType().getAllInvolvedRawTypes().stream()
                        .filter(IdSemanticsArchitectureRules::isMetaBuildType)
                        .forEach(type -> checkApiTypeGraph(type, events, visited))));
        javaClass.getMethods().forEach(method -> method.getReturnType().getAllInvolvedRawTypes().stream()
                .filter(IdSemanticsArchitectureRules::isMetaBuildType)
                .forEach(type -> checkApiTypeGraph(type, events, visited)));
    }

    private static void checkApiTypeGraph(
            JavaClass javaClass, ConditionEvents events, Set<String> visited) {
        if (!isMetaBuildType(javaClass) || !visited.add(javaClass.getName())) {
            return;
        }

        checkSemanticIdFields(javaClass, events, "API DTO graph");
        checkSemanticIdParameters(javaClass, events, "API DTO graph");
        checkSemanticIdMethods(javaClass, events, "API DTO graph");

        javaClass.getFields().forEach(field -> field.getAllInvolvedRawTypes().stream()
                .forEach(type -> checkApiTypeGraph(type, events, visited)));
        javaClass.getCodeUnits().forEach(codeUnit -> codeUnit.getParameters().forEach(parameter ->
                parameter.getType().getAllInvolvedRawTypes().stream()
                        .forEach(type -> checkApiTypeGraph(type, events, visited))));
        javaClass.getMethods().forEach(method -> method.getReturnType().getAllInvolvedRawTypes().stream()
                .forEach(type -> checkApiTypeGraph(type, events, visited)));
    }

    private static boolean involvesUuid(JavaField field) {
        return field.getAllInvolvedRawTypes().stream()
                .anyMatch(IdSemanticsArchitectureRules::isUuid);
    }

    private static boolean isUuid(JavaClass type) {
        return type.getName().equals(UUID.class.getName());
    }

    private static boolean isSemanticIdName(String name) {
        return !name.equalsIgnoreCase("traceId")
                && (name.equalsIgnoreCase("id")
                || name.matches(".*(?:Id|Ids)$")
                || name.matches(".*(?:_ID|_IDS)$"));
    }

    private static boolean isApiBoundary(JavaClass javaClass) {
        String packageName = javaClass.getPackageName();
        return packageName.startsWith("com.metabuild.admin.api")
                || packageName.startsWith("com.metabuild.api.")
                || packageName.contains(".api.")
                || packageName.endsWith(".api")
                || isControllerBoundary(javaClass);
    }

    private static boolean isControllerBoundary(JavaClass javaClass) {
        String packageName = javaClass.getPackageName();
        return javaClass.isAnnotatedWith(REST_CONTROLLER)
                || javaClass.isMetaAnnotatedWith(REST_CONTROLLER)
                || javaClass.isAnnotatedWith(CONTROLLER)
                || javaClass.isMetaAnnotatedWith(CONTROLLER)
                || packageName.contains(".controller.")
                || packageName.endsWith(".controller")
                || javaClass.getSimpleName().endsWith("Controller");
    }

    private static boolean isMetaBuildType(JavaClass type) {
        return type.getPackageName().startsWith("com.metabuild.");
    }

    private static String pathVariableName(JavaParameter parameter) {
        var annotation = parameter.getAnnotationOfType(PATH_VARIABLE);
        for (String property : java.util.List.of("name", "value")) {
            Object value = annotation.get(property).orElse("");
            if (value instanceof String explicitName && !explicitName.isBlank()) {
                return explicitName;
            }
        }

        return reflectedParameterName(parameter);
    }

    private static String reflectedParameterName(JavaParameter parameter) {
        var owner = parameter.getOwner();
        java.lang.reflect.Executable executable;
        if (owner instanceof JavaMethod method) {
            executable = method.reflect();
        } else if (owner instanceof JavaConstructor constructor) {
            executable = constructor.reflect();
        } else {
            return "";
        }
        return executable.getParameters()[parameter.getIndex()].getName();
    }
}
