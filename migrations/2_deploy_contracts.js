const GeeToken = artifacts.require("./GeeToken.sol")
const GeeTokenSale = artifacts.require("./GeeTokenSale.sol")
const config = require('../config')

module.exports = function(deployer) {
    deployer.deploy(GeeToken, config.totalSupply).then(function() {
        return deployer.deploy(GeeTokenSale, GeeToken.address, config.tokenPrice);
    });
}