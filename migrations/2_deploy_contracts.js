var Splitter = artifacts.require("./Splitter.sol");
var Remittance = artifacts.require("./Remittance.sol");

module.exports = function(deployer) {
    deployer.deploy([Splitter, Remittance]);
};
