package com.metabuild.infrastructure.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.context.support.StaticMessageSource;
import org.springframework.mock.web.MockHttpServletRequest;

class UnknownExceptionLoggingTest {

    @Test
    void logsUnknownExceptionWithItsStackContext() {
        Logger logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        boolean previousAdditive = logger.isAdditive();
        Level previousLevel = logger.getLevel();
        logger.setAdditive(false);
        logger.setLevel(Level.ERROR);
        logger.addAppender(appender);
        appender.start();

        try {
            IllegalStateException exception = new IllegalStateException("sensitive database detail");
            GlobalExceptionHandler handler = new GlobalExceptionHandler(new StaticMessageSource());

            handler.handleUnknownException(exception, new MockHttpServletRequest("GET", "/test/unknown"));

            assertEquals(1, appender.list.size());
            assertNotNull(appender.list.getFirst().getThrowableProxy());
            assertEquals("sensitive database detail", appender.list.getFirst().getThrowableProxy().getMessage());
        } finally {
            appender.stop();
            logger.detachAppender(appender);
            logger.setAdditive(previousAdditive);
            logger.setLevel(previousLevel);
        }
    }
}
