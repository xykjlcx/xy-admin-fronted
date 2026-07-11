import { z } from 'zod';

export const MessageCategorySchema = z.enum(['approval', 'security', 'system']);
export const MessageStatusSchema = z.enum(['all', 'unread', 'read']);
export const ApprovalStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export const ApprovalActionSchema = z.object({ action: z.enum(['approve', 'reject']) });
export const MessageSchema = z.object({
  id: z.string(),
  category: MessageCategorySchema,
  title: z.string(),
  from: z.string(),
  occurredAt: z.string(),
  body: z.string(),
  unread: z.boolean(),
  approvalStatus: ApprovalStatusSchema.nullable(),
});
export const MessageResultSchema = z.object({
  list: z.array(MessageSchema),
  unreadCount: z.number().int().nonnegative(),
});
export const NullSchema = z.null();

export type MessageCategory = z.infer<typeof MessageCategorySchema>;
export type MessageStatus = z.infer<typeof MessageStatusSchema>;
export type MessageDto = z.infer<typeof MessageSchema>;
export type MessageResult = z.infer<typeof MessageResultSchema>;
export type ApprovalActionInput = z.infer<typeof ApprovalActionSchema>;
