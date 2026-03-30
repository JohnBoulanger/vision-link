let resetCooldown = 60; // seconds
let negotiationWindow = 900000; // milliseconds (15 minutes)
let jobStartWindow = 7; // days (1 week)
let availabilityTimeout = 86400; // seconds (24 hours)

module.exports = {
  get resetCooldown() {
    return resetCooldown;
  },
  setResetCooldown(value) {
    resetCooldown = value;
  },

  get negotiationWindow() {
    return negotiationWindow;
  },
  setNegotiationWindow(value) {
    negotiationWindow = value;
  },

  get jobStartWindow() {
    return jobStartWindow;
  },
  setJobStartWindow(value) {
    jobStartWindow = value;
  },

  get availabilityTimeout() {
    return availabilityTimeout;
  },
  setAvailabilityTimeout(value) {
    availabilityTimeout = value;
  },
};
