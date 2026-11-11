/**
 * Service Controller Facade (Tier B Barrel Re-Export)
 *
 * Modularized into backend/controllers/serviceBooking/
 * Preserves 100% backward compatibility for all routes and test suites (IL-9).
 */

export { buildServiceRequestWaMessage } from './comms/waMessageBuilder.js';
export * from './serviceBooking/index.js';
