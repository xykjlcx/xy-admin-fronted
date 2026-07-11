package com.metabuild.app.architecture;

import com.sun.source.tree.AssignmentTree;
import com.sun.source.tree.BinaryTree;
import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.tree.ExpressionTree;
import com.sun.source.tree.IdentifierTree;
import com.sun.source.tree.LiteralTree;
import com.sun.source.tree.MemberSelectTree;
import com.sun.source.tree.MethodInvocationTree;
import com.sun.source.tree.MethodTree;
import com.sun.source.tree.NewClassTree;
import com.sun.source.tree.ReturnTree;
import com.sun.source.tree.Tree;
import com.sun.source.tree.VariableTree;
import com.sun.source.util.JavacTask;
import com.sun.source.util.TreePath;
import com.sun.source.util.TreePathScanner;
import com.sun.source.util.Trees;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import javax.lang.model.element.Element;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.VariableElement;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;

final class IdSemanticsSourceGuard {

    private IdSemanticsSourceGuard() {}

    static ScanResult scanProduction(Path backendRoot) {
        List<Path> sources = new ArrayList<>();
        try (var paths = Files.walk(backendRoot)) {
            paths.filter(Files::isRegularFile)
                    .filter(path -> path.toString().endsWith(".java"))
                    .filter(IdSemanticsSourceGuard::isProductionSource)
                    .sorted(Comparator.comparing(Path::toString))
                    .forEach(sources::add);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to enumerate backend production sources", exception);
        }
        return scan(sources);
    }

    static ScanResult scan(List<Path> sources) {
        if (sources.isEmpty()) {
            return new ScanResult(0, 0, List.of());
        }

        var compiler = ToolProvider.getSystemJavaCompiler();
        if (compiler == null) {
            throw new IllegalStateException("JDK compiler is required for the ID source guard");
        }

        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
        Set<String> violations = new LinkedHashSet<>();
        try (StandardJavaFileManager fileManager =
                compiler.getStandardFileManager(diagnostics, null, null)) {
            var units = fileManager.getJavaFileObjectsFromPaths(sources);
            List<String> options = List.of(
                    "--release",
                    "21",
                    "-proc:none",
                    "-classpath",
                    System.getProperty("java.class.path"));
            JavacTask task = (JavacTask) compiler.getTask(
                    null, fileManager, diagnostics, options, null, units);
            List<CompilationUnitTree> parsedUnits = new ArrayList<>();
            task.parse().forEach(parsedUnits::add);
            task.analyze();
            failOnCompilerErrors(diagnostics);

            Trees trees = Trees.instance(task);
            parsedUnits.forEach(unit ->
                    new PrincipalZeroScanner(unit, trees, violations).scan(unit, null));
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to analyze Java sources", exception);
        }

        int generatedCount = (int) sources.stream()
                .filter(IdSemanticsSourceGuard::isGeneratedSource)
                .count();
        return new ScanResult(sources.size(), generatedCount, List.copyOf(violations));
    }

    private static void failOnCompilerErrors(DiagnosticCollector<JavaFileObject> diagnostics) {
        List<String> errors = diagnostics.getDiagnostics().stream()
                .filter(diagnostic -> diagnostic.getKind() == Diagnostic.Kind.ERROR)
                .map(Object::toString)
                .toList();
        if (!errors.isEmpty()) {
            throw new IllegalStateException("Java source analysis failed: " + errors);
        }
    }

    private static boolean isProductionSource(Path path) {
        String normalized = path.toString().replace('\\', '/');
        return normalized.contains("/src/main/java/")
                || normalized.contains("/src/main/jooq-generated/");
    }

    private static boolean isGeneratedSource(Path path) {
        return path.toString().replace('\\', '/').contains("/src/main/jooq-generated/");
    }

    record ScanResult(int sourceCount, int generatedSourceCount, List<String> violations) {

        boolean hasViolations() {
            return !violations.isEmpty();
        }
    }

    private static final class PrincipalZeroScanner extends TreePathScanner<Void, Void> {

        private final CompilationUnitTree unit;
        private final Trees trees;
        private final Set<String> violations;

        private PrincipalZeroScanner(
                CompilationUnitTree unit, Trees trees, Set<String> violations) {
            this.unit = unit;
            this.trees = trees;
            this.violations = violations;
        }

        @Override
        public Void visitVariable(VariableTree tree, Void unused) {
            ExpressionTree initializer = tree.getInitializer();
            if (containsZero(initializer)
                    && (isPrincipalIdName(tree.getName().toString())
                            || containsPrincipalReference(initializer))) {
                addViolation(tree, tree.getName().toString());
            }
            return super.visitVariable(tree, unused);
        }

        @Override
        public Void visitAssignment(AssignmentTree tree, Void unused) {
            String name = assignedName(tree.getVariable());
            if (containsZero(tree.getExpression())
                    && (isPrincipalIdName(name)
                            || containsPrincipalReference(tree.getExpression()))) {
                addViolation(tree, name);
            }
            return super.visitAssignment(tree, unused);
        }

        @Override
        public Void visitReturn(ReturnTree tree, Void unused) {
            MethodTree method = enclosingMethod();
            ExpressionTree expression = tree.getExpression();
            if (method != null
                    && containsZero(expression)
                    && (isPrincipalIdName(method.getName().toString())
                            || containsPrincipalReference(expression))) {
                addViolation(tree, method.getName().toString());
            }
            return super.visitReturn(tree, unused);
        }

        @Override
        public Void visitBinary(BinaryTree tree, Void unused) {
            if (isComparison(tree.getKind())
                    && ((containsZero(tree.getLeftOperand())
                                    && containsPrincipalReference(tree.getRightOperand()))
                            || (containsPrincipalReference(tree.getLeftOperand())
                                    && containsZero(tree.getRightOperand())))) {
                addViolation(tree, enclosingMethodName("principal comparison"));
            }
            return super.visitBinary(tree, unused);
        }

        @Override
        public Void visitMethodInvocation(MethodInvocationTree tree, Void unused) {
            Element target = trees.getElement(getCurrentPath());
            checkInvocationArguments(tree, target, tree.getArguments());

            if (tree.getMethodSelect() instanceof MemberSelectTree memberSelect
                    && memberSelect.getIdentifier().contentEquals("equals")) {
                ExpressionTree receiver = memberSelect.getExpression();
                boolean receiverIsZero = containsZero(receiver);
                boolean receiverIsPrincipal = containsPrincipalReference(receiver);
                boolean argumentIsZero = tree.getArguments().stream().anyMatch(this::containsZero);
                boolean argumentIsPrincipal =
                        tree.getArguments().stream().anyMatch(this::containsPrincipalReference);
                if ((receiverIsZero && argumentIsPrincipal)
                        || (receiverIsPrincipal && argumentIsZero)
                        || (isJavaObjectsEquals(target)
                                && argumentIsZero
                                && argumentIsPrincipal)) {
                    addViolation(tree, enclosingMethodName("principal equality"));
                }
            }
            return super.visitMethodInvocation(tree, unused);
        }

        @Override
        public Void visitNewClass(NewClassTree tree, Void unused) {
            Element element = trees.getElement(getCurrentPath());
            if (element instanceof ExecutableElement executable) {
                checkSemanticArguments(
                        tree,
                        executable,
                        tree.getArguments(),
                        false,
                        tree.getIdentifier().toString());
            }
            return super.visitNewClass(tree, unused);
        }

        private void checkInvocationArguments(
                MethodInvocationTree tree,
                Element target,
                List<? extends ExpressionTree> arguments) {
            if (!(target instanceof ExecutableElement executable)) {
                return;
            }
            checkSemanticArguments(
                    tree,
                    executable,
                    arguments,
                    isKnownExternalAuthLogin(executable),
                    tree.getMethodSelect().toString());
        }

        private void checkSemanticArguments(
                Tree tree,
                ExecutableElement executable,
                List<? extends ExpressionTree> arguments,
                boolean principalFirstArgument,
                String displayName) {
            List<? extends VariableElement> parameters = executable.getParameters();
            int count = Math.min(parameters.size(), arguments.size());
            for (int index = 0; index < count; index++) {
                String parameterName = parameters.get(index).getSimpleName().toString();
                boolean principalArgument = isPrincipalIdName(parameterName)
                        || (index == 0
                                && principalFirstArgument
                                && isSyntheticParameterName(parameterName));
                if (principalArgument && containsZero(arguments.get(index))) {
                    addViolation(tree, displayName);
                }
            }
        }

        private boolean containsZero(Tree tree) {
            if (tree == null) {
                return false;
            }
            TreePath path = TreePath.getPath(unit, tree);
            if (path == null) {
                return false;
            }
            final boolean[] found = {false};
            new TreePathScanner<Void, Void>() {
                @Override
                public Void visitLiteral(LiteralTree literal, Void unused) {
                    if (isNumericZero(literal.getValue())) {
                        found[0] = true;
                    }
                    return found[0] ? null : super.visitLiteral(literal, unused);
                }

                @Override
                public Void visitIdentifier(IdentifierTree identifier, Void unused) {
                    if (constantIsZero(trees.getElement(getCurrentPath()))) {
                        found[0] = true;
                    }
                    return found[0] ? null : super.visitIdentifier(identifier, unused);
                }

                @Override
                public Void visitMemberSelect(MemberSelectTree memberSelect, Void unused) {
                    if (constantIsZero(trees.getElement(getCurrentPath()))) {
                        found[0] = true;
                    }
                    return found[0] ? null : super.visitMemberSelect(memberSelect, unused);
                }
            }.scan(path, null);
            return found[0];
        }

        private boolean containsPrincipalReference(Tree tree) {
            if (tree == null) {
                return false;
            }
            TreePath path = TreePath.getPath(unit, tree);
            if (path == null) {
                return false;
            }
            final boolean[] found = {false};
            new TreePathScanner<Void, Void>() {
                @Override
                public Void visitIdentifier(IdentifierTree identifier, Void unused) {
                    if (isPrincipalElement(trees.getElement(getCurrentPath()))
                            || isPrincipalIdName(identifier.getName().toString())) {
                        found[0] = true;
                    }
                    return found[0] ? null : super.visitIdentifier(identifier, unused);
                }

                @Override
                public Void visitMemberSelect(MemberSelectTree memberSelect, Void unused) {
                    if (isPrincipalElement(trees.getElement(getCurrentPath()))
                            || isPrincipalIdName(memberSelect.getIdentifier().toString())) {
                        found[0] = true;
                    }
                    return found[0] ? null : super.visitMemberSelect(memberSelect, unused);
                }
            }.scan(path, null);
            return found[0];
        }

        private void addViolation(Tree tree, String name) {
            long position = trees.getSourcePositions().getStartPosition(unit, tree);
            long line = position < 0 ? -1 : unit.getLineMap().getLineNumber(position);
            violations.add(unit.getSourceFile().toUri() + ":" + line + ": " + name
                    + " must not use the system-principal sentinel zero");
        }

        private String enclosingMethodName(String fallback) {
            MethodTree method = enclosingMethod();
            return method == null ? fallback : method.getName().toString();
        }

        private MethodTree enclosingMethod() {
            TreePath path = getCurrentPath();
            while (path != null) {
                if (path.getLeaf() instanceof MethodTree method) {
                    return method;
                }
                path = path.getParentPath();
            }
            return null;
        }

        private static String assignedName(ExpressionTree expression) {
            if (expression instanceof IdentifierTree identifier) {
                return identifier.getName().toString();
            }
            if (expression instanceof MemberSelectTree memberSelect) {
                return memberSelect.getIdentifier().toString();
            }
            return "";
        }

        private static boolean isPrincipalElement(Element element) {
            return element != null && isPrincipalIdName(element.getSimpleName().toString());
        }

        private static boolean constantIsZero(Element element) {
            return element instanceof VariableElement variable
                    && isNumericZero(variable.getConstantValue());
        }

        private static boolean isComparison(Tree.Kind kind) {
            return kind == Tree.Kind.EQUAL_TO
                    || kind == Tree.Kind.NOT_EQUAL_TO
                    || kind == Tree.Kind.LESS_THAN
                    || kind == Tree.Kind.LESS_THAN_EQUAL
                    || kind == Tree.Kind.GREATER_THAN
                    || kind == Tree.Kind.GREATER_THAN_EQUAL;
        }

        private static boolean isJavaObjectsEquals(Element target) {
            return target instanceof ExecutableElement executable
                    && executable.getSimpleName().contentEquals("equals")
                    && executable.getEnclosingElement().toString().equals("java.util.Objects");
        }

        private static boolean isKnownExternalAuthLogin(ExecutableElement executable) {
            String owner = executable.getEnclosingElement().toString();
            String method = normalizeIdentifier(executable.getSimpleName().toString());
            return owner.startsWith("cn.dev33.satoken.")
                    && (method.equals("login") || method.equals("loginas"));
        }

        private static boolean isSyntheticParameterName(String name) {
            return name.matches("arg\\d+");
        }

        private static boolean isPrincipalIdName(String name) {
            String normalized = normalizeIdentifier(name);
            return normalized.equals("principal")
                    || normalized.endsWith("principalid")
                    || normalized.endsWith("userid")
                    || normalized.endsWith("loginid")
                    || normalized.endsWith("actorid");
        }

        private static String normalizeIdentifier(String value) {
            return value.replace("_", "").replace(".", "").toLowerCase(Locale.ROOT);
        }

        private static boolean isNumericZero(Object value) {
            return value instanceof Number number && number.doubleValue() == 0.0d;
        }
    }
}
