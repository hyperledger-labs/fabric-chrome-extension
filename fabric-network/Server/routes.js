//SPDX-License-Identifier: Apache-2.0

var controller = require('./controller.js');

module.exports = (app) => {
  app.get('/network', (req, res) => {
    controller.getNetwork(req, res);
  });
  app.post('/getTransaction', (req, res) => {
    controller.getTransaction(req, res);
  });
  app.post('/autoSubmitTransaction', (req, res) => {
    controller.autoSubmitTransaction(req, res);
  });
  app.post('/submitTransactionProposal', (req, res) => {
    controller.submitTransactionProposal(req, res);
  });
  app.post('/submitSignedProposal', (req, res) => {
    controller.submitSignedProposal(req, res);
  });
  app.post('/queryLedger', (req, res) => {
    controller.queryLedger(req, res);
  });
}
