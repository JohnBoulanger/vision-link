let resetCooldown = 60; // seconds
let negotiationWindow = 600;
let jobStartWindow = 7; // days (1 week)
let availabilityTimeout = 300;

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
