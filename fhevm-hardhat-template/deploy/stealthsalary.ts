import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedStealthSalary = await deploy("StealthSalary", {
    from: deployer,
    log: true,
  });

  console.log(`StealthSalary contract: `, deployedStealthSalary.address);
};
export default func;
func.id = "deploy_stealthsalary"; // id required to prevent reexecution
func.tags = ["StealthSalary"];



