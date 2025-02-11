import hre from 'hardhat';

async function  main() {
    const [deployer] = await hre.ethers.getSigners();

    const tokenFactory = await hre.ethers.getContractFactory("Token", deployer);
    
    const initialSupply = hre.ethers.parseUnits('1000000', 18);

    const firstToken = await tokenFactory.deploy(initialSupply, "FirstToken", 18, "FT");

    firstToken.waitForDeployment();

    const firstTokenAddress = await firstToken.getAddress();

    const secondToken = await tokenFactory.deploy(initialSupply, "SecondToken", 18,  "ST");

    secondToken.waitForDeployment();

    const secondTokenAddress = await secondToken.getAddress();

    const SwapFactory = await hre.ethers.getContractFactory("Swaper", deployer);


    const swaperAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

    const initialReserve = hre.ethers.parseUnits('10000', 18);

    const swaper = await SwapFactory.deploy(firstTokenAddress, secondTokenAddress);
    
    swaper.waitForDeployment();

    await firstToken.approve(swaperAddress, initialReserve);
    await secondToken.approve(swaperAddress, initialReserve);
    
    await swaper.initialize(initialReserve);
 
    console.log("TokenA: ", firstTokenAddress);
    console.log("TokenB: ", secondTokenAddress);
    console.log("Swaper Address: ", swaperAddress);

}

main()
.then(() => process.exit(0))
.catch((error) => {
    console.error('Ошибка в процессе развертывания:', error);
    process.exit(1);
});