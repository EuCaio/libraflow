// tests/bdd/step-definitions/notification.steps.ts

import { Given, When, Then, Before, World } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import { addDays, subDays } from 'date-fns';
import { Notification, NotificationStatus, NotificationType } from '../../../src/domain/entities/Notification';
import { NotificationFactory, NotificationService, INotificationChannel } from '../../../src/application/NotificationFactory';

interface NotifWorld extends World {
  notification: Notification | null;
  service: NotificationService | null;
  daysFromNow: number;
  error: any;
}

Before(function (this: NotifWorld) {
  this.notification = null;
  this.service      = null;
  this.daysFromNow  = 14;
  this.error        = null;
});

Given('que o prazo de devolução é em {int} dias', function (this: NotifWorld, days: number) {
  this.daysFromNow = days;
});

Given('que o livro está em atraso há {int} dias', function (this: NotifWorld, days: number) {
  this.daysFromNow = -days;
});

Given('que existe um canal de email configurado', function (this: NotifWorld) {
  const mockChannel: INotificationChannel = {
    supports: () => true,
    send: async (n: Notification) => { /* mock send — succeeds silently */ },
  };
  this.service = new NotificationService([mockChannel]);
});

When('o sistema cria uma notificação de confirmação para {string} com livro {string}',
  function (this: NotifWorld, email: string, bookTitle: string) {
    this.notification = NotificationFactory.createLoanConfirmation({
      bookTitle,
      recipientEmail: email,
      dueDate: addDays(new Date(), 14).toISOString(),
    });
  },
);

When('o sistema cria um lembrete para {string} com livro {string}',
  function (this: NotifWorld, email: string, bookTitle: string) {
    const dueDate = addDays(new Date(), this.daysFromNow).toISOString();
    this.notification = NotificationFactory.createLoanReminder({
      bookTitle, recipientEmail: email, dueDate,
    });
  },
);

When('o sistema cria um alerta de atraso para {string} com livro {string}',
  function (this: NotifWorld, email: string, bookTitle: string) {
    const dueDate = addDays(new Date(), this.daysFromNow).toISOString();
    this.notification = NotificationFactory.createOverdueAlert({
      bookTitle, recipientEmail: email, dueDate,
    });
  },
);

When('o serviço envia a notificação', async function (this: NotifWorld) {
  assert.ok(this.notification, 'No notification to send');
  assert.ok(this.service, 'No service configured');
  try {
    await this.service.send(this.notification);
  } catch (err) { this.error = err; }
});

Then('a notificação deve ser do tipo {string}', function (this: NotifWorld, type: string) {
  assert.ok(this.notification);
  assert.equal(this.notification.type, type);
});

Then('a notificação deve estar com status {string}', function (this: NotifWorld, status: string) {
  assert.ok(this.notification);
  assert.equal(this.notification.getStatus(), status);
});

Then('o assunto deve mencionar {string}', function (this: NotifWorld, text: string) {
  assert.ok(this.notification);
  assert.ok(
    this.notification.subject.includes(text),
    `Expected subject to contain '${text}', got: '${this.notification.subject}'`,
  );
});

Then('a notificação deve ter status {string}', function (this: NotifWorld, status: string) {
  assert.ok(this.notification);
  assert.equal(this.notification.getStatus(), status);
});

Then('a data de envio deve estar preenchida', function (this: NotifWorld) {
  assert.ok(this.notification);
  assert.ok(this.notification.getSentAt() instanceof Date);
});
