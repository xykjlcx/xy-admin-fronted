package com.metabuild.infrastructure.exception;

import com.metabuild.infrastructure.observability.TraceIdFilter;
import com.metabuild.shared.kernel.BadRequest;
import com.metabuild.shared.kernel.Conflict;
import com.metabuild.shared.kernel.DomainException;
import com.metabuild.shared.kernel.Forbidden;
import com.metabuild.shared.kernel.NotFound;
import com.metabuild.shared.kernel.RateLimited;
import com.metabuild.shared.kernel.Unauthorized;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * 将领域错误映射为稳定的 RFC 9457 ProblemDetail。
 */
@RestControllerAdvice
public final class GlobalExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private final MessageSource messageSource;

    public GlobalExceptionHandler(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ProblemDetail> handleDomainException(
            DomainException exception,
            HttpServletRequest request) {
        HttpStatus status = statusOf(exception);
        return problem(status, exception.errorCode().code(), exception.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(
            MethodArgumentNotValidException exception,
            HttpServletRequest request) {
        return problem(
                HttpStatus.BAD_REQUEST,
                "request.validation.failed",
                "request.validation.failed",
                request);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemDetail> handleMalformedRequest(
            HttpMessageNotReadableException exception,
            HttpServletRequest request) {
        return problem(HttpStatus.BAD_REQUEST, "request.malformed", "request.malformed", request);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ProblemDetail> handleTypeMismatch(
            MethodArgumentTypeMismatchException exception,
            HttpServletRequest request) {
        return problem(
                HttpStatus.BAD_REQUEST,
                "request.type-mismatch",
                "request.type-mismatch",
                request);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ProblemDetail> handleMissingParameter(
            MissingServletRequestParameterException exception,
            HttpServletRequest request) {
        return problem(
                HttpStatus.BAD_REQUEST,
                "request.parameter.missing",
                "request.parameter.missing",
                request);
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ProblemDetail> handleMissingMultipartPart(
            MissingServletRequestPartException exception,
            HttpServletRequest request) {
        return problem(
                HttpStatus.BAD_REQUEST,
                "request.multipart.missing",
                "request.multipart.missing",
                request);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ProblemDetail> handleUploadTooLarge(
            MaxUploadSizeExceededException exception,
            HttpServletRequest request) {
        return problem(
                HttpStatus.PAYLOAD_TOO_LARGE,
                "request.upload.too-large",
                "request.upload.too-large",
                request);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ProblemDetail> handleMethodNotAllowed(
            HttpRequestMethodNotSupportedException exception,
            HttpServletRequest request) {
        return problem(
                HttpStatus.METHOD_NOT_ALLOWED,
                "request.method.not-allowed",
                "request.method.not-allowed",
                request);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ProblemDetail> handleUnsupportedMediaType(
            HttpMediaTypeNotSupportedException exception,
            HttpServletRequest request) {
        return problem(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "request.media-type.unsupported",
                "request.media-type.unsupported",
                request);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ProblemDetail> handleMissingResource(
            NoResourceFoundException exception,
            HttpServletRequest request) {
        return problem(
                HttpStatus.NOT_FOUND,
                "request.resource.not-found",
                "request.resource.not-found",
                request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnknownException(
            Exception exception,
            HttpServletRequest request) {
        LOGGER.error("Unhandled server exception", exception);
        return problem(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "internal.server-error",
                "internal.server-error",
                request);
    }

    private ResponseEntity<ProblemDetail> problem(
            HttpStatus status,
            String code,
            String detail,
            HttpServletRequest request) {
        String localizedDetail = messageSource.getMessage(
                code,
                null,
                detail,
                LocaleContextHolder.getLocale());
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, localizedDetail);
        problem.setType(URI.create("about:blank"));
        problem.setTitle(status.getReasonPhrase());
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("code", code);
        problem.setProperty(
                "traceId",
                Objects.toString(request.getAttribute(TraceIdFilter.REQUEST_ATTRIBUTE), ""));
        return ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(problem);
    }

    private HttpStatus statusOf(DomainException exception) {
        return switch (exception) {
            case BadRequest ignored -> HttpStatus.BAD_REQUEST;
            case Unauthorized ignored -> HttpStatus.UNAUTHORIZED;
            case Forbidden ignored -> HttpStatus.FORBIDDEN;
            case NotFound ignored -> HttpStatus.NOT_FOUND;
            case Conflict ignored -> HttpStatus.CONFLICT;
            case RateLimited ignored -> HttpStatus.TOO_MANY_REQUESTS;
            default -> throw new IllegalStateException(
                    "Unsupported domain exception: " + exception.getClass().getName());
        };
    }
}
