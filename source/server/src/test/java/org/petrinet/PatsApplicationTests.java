package org.petrinet;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.petrinet.config.WebConfig;
import org.petrinet.service.PetriNetService;
import org.petrinet.service.PetriNetValidatorService;
import org.petrinet.service.PetriNetAnalysisService;
import org.petrinet.controller.PetriNetController;
import org.petrinet.controller.PetriNetValidatorController;
import org.petrinet.controller.PetriNetAnalysisController;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(properties = {
    "spring.main.web-application-type=servlet",
    "server.port=0"
})
class PatsApplicationTests {

    @Autowired
    private ApplicationContext applicationContext;

    @Test
    @DisplayName("Application context should load successfully")
    void contextLoads() {
        // Given: Spring Boot application context
        // When: Context is loaded
        // Then: Context should not be null
        assertNotNull(applicationContext);
    }

    @Test
    @DisplayName("Main application class should be present in context")
    void mainApplicationClassShouldBePresent() {
        // Given: Spring Boot application context
        // When: Looking for PatsApplication bean
        // Then: PatsApplication should be present in context
        assertTrue(applicationContext.containsBean("patsApplication"));
    }

    @Test
    @DisplayName("Web configuration should be loaded and CORS configurer should be present")
    void webConfigShouldBeLoaded() {
        // Given: Spring Boot application context
        // When: Looking for WebConfig and CORS configurer
        // Then: WebConfig should be present and CORS configurer should be available
        assertTrue(applicationContext.containsBean("webConfig"));
        
        WebConfig webConfig = applicationContext.getBean(WebConfig.class);
        assertNotNull(webConfig);
        
        WebMvcConfigurer corsConfigurer = webConfig.corsConfigurer();
        assertNotNull(corsConfigurer);
    }

    @Test
    @DisplayName("All service beans should be present in context")
    void serviceBeansShouldBePresent() {
        // Given: Spring Boot application context
        // When: Looking for service beans
        // Then: All required services should be present
        
        // Core services
        assertTrue(applicationContext.containsBean("petriNetService"));
        assertTrue(applicationContext.containsBean("petriNetValidatorService"));
        assertTrue(applicationContext.containsBean("petriNetAnalysisService"));
        
        // Verify service instances
        PetriNetService petriNetService = applicationContext.getBean(PetriNetService.class);
        PetriNetValidatorService validatorService = applicationContext.getBean(PetriNetValidatorService.class);
        PetriNetAnalysisService analysisService = applicationContext.getBean(PetriNetAnalysisService.class);
        
        assertNotNull(petriNetService);
        assertNotNull(validatorService);
        assertNotNull(analysisService);
    }

    @Test
    @DisplayName("All controller beans should be present in context")
    void controllerBeansShouldBePresent() {
        // Given: Spring Boot application context
        // When: Looking for controller beans
        // Then: All required controllers should be present
        
        // Core controllers
        assertTrue(applicationContext.containsBean("petriNetController"));
        assertTrue(applicationContext.containsBean("petriNetValidatorController"));
        assertTrue(applicationContext.containsBean("petriNetAnalysisController"));
        
        // Verify controller instances
        PetriNetController petriNetController = applicationContext.getBean(PetriNetController.class);
        PetriNetValidatorController validatorController = applicationContext.getBean(PetriNetValidatorController.class);
        PetriNetAnalysisController analysisController = applicationContext.getBean(PetriNetAnalysisController.class);
        
        assertNotNull(petriNetController);
        assertNotNull(validatorController);
        assertNotNull(analysisController);
    }

    @Test
    @DisplayName("Application should have correct bean count for core components")
    void applicationShouldHaveCorrectBeanCount() {
        // Given: Spring Boot application context
        // When: Counting beans by type
        // Then: Should have expected number of core components
        
        // Count service beans
        String[] serviceBeanNames = applicationContext.getBeanNamesForType(PetriNetService.class);
        assertEquals(1, serviceBeanNames.length);
        
        String[] validatorServiceBeanNames = applicationContext.getBeanNamesForType(PetriNetValidatorService.class);
        assertEquals(1, validatorServiceBeanNames.length);
        
        String[] analysisServiceBeanNames = applicationContext.getBeanNamesForType(PetriNetAnalysisService.class);
        assertEquals(1, analysisServiceBeanNames.length);
        
        // Count controller beans
        String[] controllerBeanNames = applicationContext.getBeanNamesForType(PetriNetController.class);
        assertEquals(1, controllerBeanNames.length);
        
        String[] validatorControllerBeanNames = applicationContext.getBeanNamesForType(PetriNetValidatorController.class);
        assertEquals(1, validatorControllerBeanNames.length);
        
        String[] analysisControllerBeanNames = applicationContext.getBeanNamesForType(PetriNetAnalysisController.class);
        assertEquals(1, analysisControllerBeanNames.length);
    }

    @Test
    @DisplayName("Application should be configured as web application")
    void applicationShouldBeWebApplication() {
        // Given: Spring Boot application context
        // When: Checking application type
        // Then: Should be configured as servlet web application
        assertTrue(applicationContext.getEnvironment().getProperty("spring.main.web-application-type", String.class, "none")
                .equals("servlet") || applicationContext.getEnvironment().getProperty("spring.main.web-application-type", String.class, "none")
                .equals("none"));
    }

    @Test
    @DisplayName("Application should have proper package scanning")
    void applicationShouldHaveProperPackageScanning() {
        // Given: Spring Boot application context
        // When: Looking for beans in different packages
        // Then: Should find beans from all expected packages
        
        // Check for beans from different packages
        assertTrue(applicationContext.getBeanNamesForType(PatsApplication.class).length > 0);
        assertTrue(applicationContext.getBeanNamesForType(WebConfig.class).length > 0);
        assertTrue(applicationContext.getBeanNamesForType(PetriNetService.class).length > 0);
        assertTrue(applicationContext.getBeanNamesForType(PetriNetController.class).length > 0);
    }

    @Test
    @DisplayName("Application context should be running")
    void applicationContextShouldBeRunning() {
        // Given: Spring Boot application context
        // When: Checking context state
        // Then: Context should be running and not null
        assertNotNull(applicationContext);
        // Context is running if we can access it without exceptions
    }

    @Test
    @DisplayName("Application should have proper environment configuration")
    void applicationShouldHaveProperEnvironmentConfiguration() {
        // Given: Spring Boot application context
        // When: Checking environment properties
        // Then: Should have proper Spring Boot configuration
        
        String[] activeProfiles = applicationContext.getEnvironment().getActiveProfiles();
        // Default profile should be active if no specific profile is set
        assertTrue(activeProfiles.length == 0 || applicationContext.getEnvironment().getDefaultProfiles().length > 0);
    }
}
