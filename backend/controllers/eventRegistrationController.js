/**
 * Event Registration Controller Facade (Tier B Barrel Re-Export)
 *
 * Modularized into backend/controllers/eventRegistration/
 * Preserves 100% backward compatibility for all routes and test suites (IL-9).
 */

export { buildEventRegistrationWaMessage } from './comms/waMessageBuilder.js';
export * from './eventRegistration/index.js';
