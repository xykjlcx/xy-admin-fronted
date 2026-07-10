package com.metabuilder.admin.api;

import java.util.UUID;

/**
 * 附件上传能力端口。
 */
public interface AttachmentApi {

    UploadTicket issueUploadTicket(UploadPolicy policy, UUID actorId, String purpose);
}
