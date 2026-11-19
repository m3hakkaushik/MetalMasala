import { sendMail } from '../../services/mail.service.js';
import { debugData } from '../../utils/logger.js';
import { EVENTS } from '../events.js';

export function registerNotifications(bus) {
  // The registration event itself is emitted once per new user. A once observer records the first welcome.
  bus.once(EVENTS.USER_REGISTERED, () =>
    debugData('First welcome email generated')
  );
  bus.on(EVENTS.USER_REGISTERED, ({ user }) =>
    sendMail({
      userId: user.id,
      subject: 'Welcome to Metal Masala',
      text: 'Your account is ready.',
    })
  );
  bus.on(EVENTS.ORDER_PLACED, ({ order }) =>
    sendMail({
      userId: order.user,
      subject: 'Order placed',
      text: `We received order ${order.orderNumber}.`,
    })
  );
  bus.on(EVENTS.ORDER_STATUS_CHANGED, ({ order, to }) =>
    sendMail({
      userId: order.user,
      subject: 'Order update',
      text: `Order ${order.orderNumber} is now ${to}.`,
    })
  );
  bus.on(EVENTS.REVIEW_CREATED, ({ review }) =>
    debugData('Review saved %s', review.id)
  );
}
