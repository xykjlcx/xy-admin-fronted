package com.metabuilder.admin.api;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.file.Path;
import java.util.HashSet;
import java.util.Set;
import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

class ModuleDependenciesTest {

    @Test
    void sharedKernelHasNoProductionDependencies() throws Exception {
        Path sharedKernelPom = Path.of(System.getProperty("basedir"), "../shared-kernel/pom.xml");

        assertEquals(Set.of(), productionCoordinates(sharedKernelPom));
    }

    @Test
    void adminApiDependsOnlyOnSharedKernelInProduction() throws Exception {
        Path adminApiPom = Path.of(System.getProperty("basedir"), "pom.xml");

        assertEquals(
                Set.of("com.metabuilder:metabuilder-shared-kernel"),
                productionCoordinates(adminApiPom));
    }

    private static Set<String> productionCoordinates(Path pom) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        Element project = factory.newDocumentBuilder().parse(pom.toFile()).getDocumentElement();
        NodeList dependencies = project.getElementsByTagName("dependency");
        Set<String> coordinates = new HashSet<>();
        for (int index = 0; index < dependencies.getLength(); index++) {
            Element dependency = (Element) dependencies.item(index);
            if (!"test".equals(directChildText(dependency, "scope"))) {
                coordinates.add(
                        directChildText(dependency, "groupId")
                                + ":"
                                + directChildText(dependency, "artifactId"));
            }
        }
        return Set.copyOf(coordinates);
    }

    private static String directChildText(Element element, String tagName) {
        NodeList children = element.getChildNodes();
        for (int index = 0; index < children.getLength(); index++) {
            Node child = children.item(index);
            if (child instanceof Element childElement && tagName.equals(childElement.getTagName())) {
                return childElement.getTextContent().trim();
            }
        }
        return "";
    }
}
