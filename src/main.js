import TokenJSON from '../artifacts/contracts/token.sol/Token.json' with { type: 'json' };
import SwaperJSON from '../artifacts/contracts/swaper.sol/Swaper.json' with { type: 'json' };
import { BrowserProvider, Contract, formatUnits, parseUnits } from 'ethers';

const tokenAbi = TokenJSON.abi;
const swaperAbi = SwaperJSON.abi;

// Конфигурация контрактов
const contractAddresses = {
  tokenA: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  tokenB: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  swaper: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
};

const elements = {
    reserve: {
        form: document.getElementById("addReserve"),
        inputs: {
            first: document.getElementById("firstTokenAmount"),
            second: document.getElementById("secondTokenAmount")
        }
    },
    swap: {
        form: document.getElementById("swapForm"),
        inputs: {
            amount: document.getElementById("swapAmount"),
            isTokenA: document.getElementById("isTokenA")
        }
    }
}


let signer = null;
let provider = null;
let userAddress = null;

let tokenA = null;
let tokenB = null;
let swaper = null;

async function init() {
  try {
    if (!window.ethereum) {
      alert('Пожалуйста, установите MetaMask!');
      return;
    }

    provider = new BrowserProvider(window.ethereum);
    

    const network = await provider.getNetwork();
    console.log('Connected to network:', network.name, network.chainId);


    const accounts = await provider.send("eth_requestAccounts", []);
    
    if (accounts.length === 0) {
      throw new Error('Аккаунты не обнаружены');
    }


    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    
    console.log('Успешная инициализация:', {
      userAddress,
      provider,
      signer
    });

  } catch (error) {
    console.error('Ошибка инициализации:', error);
    alert(`Ошибка: ${error.message}`);
  }
}

window.addEventListener('load', async () => {
  try {
    await init();
    await initializeContracts();
  } catch (error) {
    console.error('Ошибка при загрузке:', error);
  }
});

// Инициализация контрактов
async function initializeContracts() {
  try {
    if (!provider || !signer) {
      throw new Error('Провайдер не инициализирован');
    }

     tokenA = new Contract(
      contractAddresses.tokenA,
      tokenAbi,
      signer
    );

     tokenB = new Contract(
      contractAddresses.tokenB,
      tokenAbi,
      signer
    );

     swaper = new Contract(
      contractAddresses.swaper,
      swaperAbi,
      signer
    );

    console.log('Контракты инициализированы:', { tokenA, tokenB, swaper });

  } catch (error) {
    console.error('Ошибка инициализации контрактов:', error);
  }
}

elements.reserve.form.addEventListener('submit', async (event) => {
    try {
        event.preventDefault();
        const tokenAAmountBN = parseUnits(elements.reserve.inputs.first.value.trim(), 18);
        const tokenBAmountBN = parseUnits(elements.reserve.inputs.second.value.trim(), 18);
        
        const [balanceA, balanceB] = await Promise.all([
            tokenA.balanceOf(userAddress),
            tokenB.balanceOf(userAddress)
        ]);
    
        console.log(balanceA);
        console.log(balanceB);
    
        if ((balanceA < tokenAAmountBN) || (balanceB < tokenBAmountBN)) {
            alert("Not anougth tokens for add")
            return;
        }
    
        await Promise.all([
            checkAndApprove(tokenA, tokenAAmountBN),
            checkAndApprove(tokenB, tokenBAmountBN)
        ]);

        const balanceABefore = formatUnits(await swaper.tokenAReserve(), 18);
        const balanceBBefore = formatUnits(await swaper.tokenBReserve(), 18);
        console.log("Balances before: ", balanceABefore);
        console.log(balanceBBefore);

        const tx = await swaper.addReserve(tokenAAmountBN, tokenBAmountBN);
        const receipt = await tx.wait();
        if (receipt.status === 0){
            alert("Transfer failed")
            return;
        }

        const balanceAAfter = formatUnits(await swaper.tokenAReserve(), 18);
        const balanceBAfter = formatUnits(await swaper.tokenBReserve(), 18);
        console.log("Balances after: ", balanceAAfter);
        console.log(balanceBAfter);
    
    } catch (error) {
        console.error(error.message);        
    }
})

const checkAndApprove = async (tokenContract, amount) => {
    const currentAllowance = await tokenContract.allowance(userAddress, contractAddresses.swaper);
    console.log(currentAllowance);
    if (currentAllowance < amount) {
        const tx = await tokenContract.approve(
            contractAddresses.swaper,
            amount,
            { gasLimit: 500000 } 
        );
        await tx.wait(); 
        return true;
    }
    return false;
};