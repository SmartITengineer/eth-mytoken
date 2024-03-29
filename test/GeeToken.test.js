var GeeToken = artifacts.require("./GeeToken.sol");
const config = require('../config')

contract('GeeToken', function(accounts) {
    var tokenInstance;

    it('initializes the contract with the correct values', function() {
        return GeeToken.deployed().then(function(instance) {
            tokenInstance = instance;
            return tokenInstance.name();
        }).then(function(name) {
            assert.equal(name, 'Gee Token', 'has the correct name');
            return tokenInstance.symbol();
        }).then(function(symbol) {
            assert.equal(symbol, 'GEE', 'has the correct symbol');
            return tokenInstance.standard();
        }).then(function(standard) {
            assert.equal(standard, 'Gee Token v1.0', 'has the correct standard');
        });
    });

    it('allocates the initial supply upon deployment', function() {
        return GeeToken.deployed().then(function(instance) {
            tokenInstance = instance;
            return tokenInstance.totalSupply();
        }).then(function(totalSupply) {
            assert.equal(totalSupply.toNumber(), config.totalSupply, `sets the total supply to ${config.totalSupply}`);
            return tokenInstance.balanceOf(accounts[0]);
        }).then(function(adminBalance) {
            assert.equal(adminBalance.toNumber(), config.totalSupply, `it allocated the initial supply to the admin account`);
        });
    });

    it('transfers token ownership', function() {
        return GeeToken.deployed().then(function(instance) {
            tokenInstance = instance;
            // Test `require` statement first by transferring something larger than the sender's balance
            return tokenInstance.transfer.call(accounts[1], config.testTransferOverflow);
        }).then(assert.fail).catch(function(err) {
            assert(err.message.indexOf('revert') >= 0, 'error message must contain revert');
            return tokenInstance.transfer.call(accounts[1], config.testTransferNormal, { from: accounts[0] });
        }).then(function(success) {
            assert.equal(success, true, 'it returns true');
            return tokenInstance.transfer(accounts[1], config.testTransferNormal, { from: accounts[0] });
        }).then(function(receipt) {
            assert.equal(receipt.logs.length, 1, 'triggers one event');
            assert.equal(receipt.logs[0].event, 'Transfer', 'should be the `Transfer` event');
            assert.equal(receipt.logs[0].args._from, accounts[0], 'logs the account the tokens are trasferred from');
            assert.equal(receipt.logs[0].args._to, accounts[1], 'logs the account the tokens are trasferred to');
            assert.equal(receipt.logs[0].args._value, config.testTransferNormal, 'logs the transfer amount');
            return tokenInstance.balanceOf(accounts[1]);
        }).then(function(balance) {
            assert.equal(balance.toNumber(), config.testTransferNormal, 'adds the amount to the receiving account');
            return tokenInstance.balanceOf(accounts[0]);
        }).then(function(balance) {
            assert.equal(balance.toNumber(), config.totalSupply - config.testTransferNormal, 'deduts the amount of sent');
        });
    });

    it('handles delegated token transfers', function() {
        return GeeToken.deployed().then(function(instance) {
          tokenInstance = instance;
          fromAccount = accounts[2];
          toAccount = accounts[3];
          spendingAccount = accounts[4];
          // Transfer some tokens to fromAccount
          return tokenInstance.transfer(fromAccount, 100, { from: accounts[0] });
        }).then(function(receipt) {
          // Approve spendingAccount to spend 10 tokens form fromAccount
          return tokenInstance.approve(spendingAccount, 10, { from: fromAccount });
        }).then(function(receipt) {
          // Try transferring something larger than the sender's balance
          return tokenInstance.transferFrom(fromAccount, toAccount, 9999, { from: spendingAccount });
        }).then(assert.fail).catch(function(error) {
          assert(error.message.indexOf('revert') >= 0, 'cannot transfer value larger than balance');
          // Try transferring something larger than the approved amount
          return tokenInstance.transferFrom(fromAccount, toAccount, 20, { from: spendingAccount });
        }).then(assert.fail).catch(function(error) {
          assert(error.message.indexOf('revert') >= 0, 'cannot transfer value larger than approved amount');
          return tokenInstance.transferFrom.call(fromAccount, toAccount, 10, { from: spendingAccount });
        }).then(function(success) {
          assert.equal(success, true);
          return tokenInstance.transferFrom(fromAccount, toAccount, 10, { from: spendingAccount });
        }).then(function(receipt) {
          assert.equal(receipt.logs.length, 1, 'triggers one event');
          assert.equal(receipt.logs[0].event, 'Transfer', 'should be the "Transfer" event');
          assert.equal(receipt.logs[0].args._from, fromAccount, 'logs the account the tokens are transferred from');
          assert.equal(receipt.logs[0].args._to, toAccount, 'logs the account the tokens are transferred to');
          assert.equal(receipt.logs[0].args._value, 10, 'logs the transfer amount');
          return tokenInstance.balanceOf(fromAccount);
        }).then(function(balance) {
          assert.equal(balance.toNumber(), 90, 'deducts the amount from the sending account');
          return tokenInstance.balanceOf(toAccount);
        }).then(function(balance) {
          assert.equal(balance.toNumber(), 10, 'adds the amount from the receiving account');
          return tokenInstance.allowance(fromAccount, spendingAccount);
        }).then(function(allowance) {
          assert.equal(allowance.toNumber(), 0, 'deducts the amount from the allowance');
        });
      });
});