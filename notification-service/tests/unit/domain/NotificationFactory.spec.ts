// tests/unit/domain/NotificationFactory.spec.ts

import { NotificationFactory } from '../../../src/application/NotificationFactory';
import { NotificationStatus, NotificationType } from '../../../src/domain/entities/Notification';
import { addDays, subDays } from 'date-fns';

describe('NotificationFactory', () => {
  describe('createLoanConfirmation()', () => {
    it('should create a LOAN_CREATED notification', () => {
      const n = NotificationFactory.createLoanConfirmation({
        bookTitle: 'Clean Code',
        recipientEmail: 'user@test.com',
        dueDate: addDays(new Date(), 14).toISOString(),
      });
      expect(n.type).toBe(NotificationType.LOAN_CREATED);
      expect(n.recipientEmail).toBe('user@test.com');
      expect(n.subject).toContain('Clean Code');
      expect(n.getStatus()).toBe(NotificationStatus.PENDING);
    });
  });

  describe('createLoanReminder()', () => {
    it('should include days left in subject', () => {
      const dueDate = addDays(new Date(), 3).toISOString();
      const n = NotificationFactory.createLoanReminder({
        bookTitle: 'Domain Driven Design',
        recipientEmail: 'user@test.com',
        dueDate,
      });
      expect(n.type).toBe(NotificationType.LOAN_REMINDER);
      expect(n.subject).toContain('3 dias');
    });
  });

  describe('createOverdueAlert()', () => {
    it('should include days overdue in subject', () => {
      const dueDate = subDays(new Date(), 5).toISOString();
      const n = NotificationFactory.createOverdueAlert({
        bookTitle: 'SOLID Principles',
        recipientEmail: 'user@test.com',
        dueDate,
      });
      expect(n.type).toBe(NotificationType.LOAN_OVERDUE);
      expect(n.subject).toContain('5 dias');
    });
  });
});

describe('NotificationService', () => {
  it('should call channel.send and mark notification as SENT', async () => {
    const { NotificationService } = await import('../../../src/application/NotificationFactory');
    const { Notification, NotificationType, NotificationStatus } = await import('../../../src/domain/entities/Notification');

    const mockChannel = {
      supports: () => true,
      send: jest.fn().mockResolvedValue(undefined),
    };

    const service = new NotificationService([mockChannel as any]);
    const notification = new Notification({
      type: NotificationType.LOAN_CREATED,
      recipientEmail: 'test@test.com',
      subject: 'Test',
      body: 'Test body',
    });

    await service.send(notification);

    expect(mockChannel.send).toHaveBeenCalledWith(notification);
    expect(notification.getStatus()).toBe(NotificationStatus.SENT);
  });
});
