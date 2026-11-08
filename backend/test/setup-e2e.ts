const { loadTestEnvironment } = require('./test-environment.cjs') as {
  loadTestEnvironment: () => void;
};

loadTestEnvironment();
