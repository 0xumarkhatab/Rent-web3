import {
  Button,
  Heading,
  VStack,
  Input,
  Text,
  Highlight,
  Box,
  Center,
} from "@chakra-ui/react";
import {
  getCustomNetworkSaleContract,
  getCustomNetworkSaleTrackerContract,
  getTronSaleTrackerContract,
  SaleABI,
  SaleBytecode,
} from "../data/Sale";
import {
  fetchWhitelistAddresses,
  getBlockchainSpecificWhitelistFactoryContract,
  getBlockchainSpecificWhitelistTrackerContract,
  getCustomNetworkWhitelistContract,
  getCustomNetworkWhitelistTrackerContract,
} from "../data/Whitelist";

import React, { useEffect, useState, useRef } from "react";
import NamedInput from "./components/NamedInput";
import Link from "next/link";
import Card from "./components/Card/Card";
import Sale from "./components/Sale";
import LinkButton from "./components/LinkButton/LinkButton";
import DropDownMenu from "./components/DropDownMenu";
import SuccessfulDeployment from "./components/SuccessfulDeployment";
import { getProviderOrSigner } from "../data/accountsConnection";
import { getMinimalAddress } from "../Utilities";
import {
  deploy_tron_contract,
  tronConnect,
} from "../data/TronAccountsManagement";
import { useSelector } from "react-redux";
import { parseEther } from "ethers/lib/utils";

// let NetworkChain = "goerli";
// let Blockchain = "ethereum";

function CreateSale() {
  /**
   *  For Theming
   */
  let bg = "black";
  let textColor = "white";
  /** */
  const selectedBlockchainInformation = useSelector(
    (state) => state.blockchain.value
  );
  // console.log(selectedBlockchainInformation)
  let Blockchain = selectedBlockchainInformation.name;
  let NetworkChain = selectedBlockchainInformation.network;
  let connectedAddress = selectedBlockchainInformation.address;

  const [formStep, setFormStep] = useState(1);
  const [deployedAddress, setDeployedAddress] = useState(null);
  const [whitelists, setWhitelists] = useState([]);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [baseURI, setBaseURI] = useState("");
  const [owner, setOwner] = useState(connectedAddress);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [presaleMintRate, setPresaleMintRate] = useState(1);
  const [publicMintRate, setPublicMintRate] = useState(2);
  const [totalSupply, setTotalSupply] = useState("");
  const [whitelistAddress, setWhitelistAddress] = useState(null);
  const [loader, setLoader] = useState(false);
  const Web3ModalRef = useRef();
  const [saleTrackerContract, setSaleTrackerContract] = useState(null);
  const [saleContract, setSaleContract] = useState(null);
  const [whitelistFactory, setWhitelistFactory] = useState(null);
  const [fetching, setFetching] = useState(false);

  function setStatus(message) {
    let ele = document.getElementById("creationStatus");
    var p_tag = document.createElement("p");
    if (!ele) return;
    p_tag.key = `message${message}`;
    p_tag.textContent = "-> " + message;
    ele.append(p_tag);
  }

  async function fetchDetails() {
    if (!whitelistAddress) {
      alert("select valid whitelist");
      return null;
    }
    setFetching(true);

    await getBlockchainSpecificWhitelistFactoryContract(
      Blockchain,
      NetworkChain,
      Web3ModalRef,
      whitelistAddress
    )
      .then(async (contract) => {
        console.log("fetching details from ", contract);
        let _name, _symbol, _baseURI, _owner;

        if (Blockchain == "tron") {
          _name = await contract.name().call();
          setName(_name);
          _symbol = await contract.symbol().call();
          setSymbol(_symbol);
          _baseURI = await contract.baseURI().call();
          setBaseURI(_baseURI);
        } else if (Blockchain == "ethereum") {
          _name = await contract.name();
          setName(_name);
          _symbol = await contract.symbol();
          setSymbol(_symbol);
          _baseURI = await contract.baseURI();
          setBaseURI(_baseURI);
        } else if (Blockchain == "polygon") {
        } else {
          // no support yet
        }
        setFormStep((prev) => prev + 1);
      })
      .catch((e) => {
        console.log(e);
      });
  }
  async function deploySale(saleobj) {
    if (!Blockchain || !saleobj) {
      console.log("No Blockchain...");
    }
    let sale = { ...saleobj };
    if (Blockchain == "ethereum") {
      setFormStep((prev) => prev + 1);
      setLoader((prev) => prev !== true && true);
      setStatus("Creating Ethereum whitelist..");
    } else if (Blockchain == "tron") {
      setFormStep((prev) => prev + 1);
      setLoader((prev) => prev !== true && true);
      let connectedUser = await tronConnect();
      console.log("connected address is ", connectedUser);
      setStatus("Creating Tron whitelist..");
    } else if (Blockchain == "polygon") {
      setFormStep((prev) => prev + 1);
      setLoader((prev) => prev !== true && true);
      setStatus("Creatibg Polygon whitelist..");
    } else {
      alert("Invalid Blockhain");
      return null;
    }

    sale.presaleMintRate = presaleMintRate;
    sale.publicMintRate = publicMintRate;
    (async () => {
      // Deploy the contract to Ethereum test network - Goerli

      // Deploy the contract
      const factory = saleContract;
      try {
        setStatus("Deploying " + sale.name + "..");
        let deploymentAddress = null;
        if (Blockchain == "tron") {
          let paramters = [
            whitelistAddress,
            sale.name,
            sale.symbol,
            connectedAddress,
            sale.baseURI,
            sale.startTime,
            sale.endTime,
            presaleMintRate * 1000000,
            publicMintRate * 1000000,
            sale.saleSupply,
          ];
          let saleAbi = SaleABI;
          let bytecode = SaleBytecode;
          deploymentAddress = await deploy_tron_contract(
            NetworkChain,
            saleAbi,
            bytecode,
            paramters,
            setStatus
          );
          if (deploymentAddress == null) {
            setDeployedAddress("none");
            return;
          }
          await trackSaleDeployment(deploymentAddress);
        } else if (Blockchain == "ethereum") {
          const contract = await factory.deploy(
            whitelistAddress,
            sale.name,
            sale.symbol,
            sale.owner,
            sale.baseURI,
            sale.startTime,
            sale.endTime,
            parseEther(presaleMintRate.toString()),
            parseEther(publicMintRate.toString()),
            sale.saleSupply
          );

          // "uar",100,owner,baseURI,1665317824956,1665317824956

          let tx = await contract.deployed();
          console.log(tx);
          setStatus("It's taking longer but bear with us :/ ");
          // await tx.wait();
          setStatus(`Deployment successful 🎉 `);
          setStatus(`Contract Address:`);

          setStatus(getMinimalAddress(contract.address, true));

          deploymentAddress = contract.address;
          await trackSaleDeployment(contract.address);
        } else if (Blockchain == "polygon") {
          // yet to implement
        }
      } catch (e) {
        alert("deployment unsuccessful :(");
        alert("See Console for Details !");
        console.log("Deployment Unsuccessful Error", e);
      }
    })();
  }

  async function trackSaleDeployment(contractAddress) {
    if (Blockchain == "tron") {
      setStatus("Keeping its track for Future!");
      setStatus("Storing on Blockchain..");
      console.log("Storing ", contractAddress, " for ", connectedAddress);
      let contract = await getTronSaleTrackerContract(NetworkChain);
      setTimeout(() => {
        setStatus("For Securing your collection , Let's wait ");
        setStatus("Let's wait for Confirmation");
      }, 2000);
      try {
        let receipt = await contract.addUserSale(connectedAddress, contractAddress).send({
          feeLimit: 100000000,
          callValue: 0,
          tokenId: "",
          tokenValue: "",
          shouldPollResponse: true,
        });
        console.log("stored",receipt)
      } catch (e) {
        setStatus("Error: Deployment Unsuccessful");
        console.log("error ", e);
      }

      setStatus("Storage Successful 🎉");

      setDeployedAddress(contractAddress);
    } else if (Blockchain == "ethereum") {
      let contract = saleTrackerContract;
      try {
        setStatus("Keeping its track for Future!");
        setStatus("Storing on Blockchain..");

        let tx = await contract.addUserSale(owner, contractAddress);
        setStatus("Waiting for Transaction Completion ");

        await tx.wait();
      } catch (e) {
        setStatus("Error: Deployment Unsuccessful");
        console.log("error ", e);
      }

      setStatus("Storage Successful 🎉");

      setDeployedAddress(contractAddress);
    }
  }

  async function getUserWhitelists() {
    let user = null;
    let trackerContract = null;
    if (Blockchain == "tron") {
      let connectedUser = await tronConnect();
      if (connectedUser) {
        user = connectedUser;
      }
    } else if (Blockchain == "ethereum") {
      let signer = await getProviderOrSigner(NetworkChain, Web3ModalRef, true);
      let connectedUser = await signer.getAddress();
      user = connectedUser;
    } else if (Blockchain == "polygon") {
      //
    } else {
      return null;
    }
    trackerContract = await getBlockchainSpecificWhitelistTrackerContract(
      Blockchain,
      NetworkChain,
      Web3ModalRef
    );
    console.log("Owner is ", user);
    await fetchWhitelistAddresses(
      trackerContract,
      user,
      setWhitelists,
      Blockchain
    );
    setOwner(user);
  }

  async function init() {
    getUserWhitelists();
    console.log("Blockchain is ", selectedBlockchainInformation);
    if (Blockchain === "ethereum") {
      getCustomNetworkSaleContract(NetworkChain, Web3ModalRef)
        .then(async (contract) => {
          setSaleContract(contract);
        })
        .catch((e) => {
          console.log("error  in obtaining the contract ");
        });
      getCustomNetworkSaleTrackerContract(NetworkChain, Web3ModalRef)
        .then(async (contract) => {
          setSaleTrackerContract(contract);
        })
        .catch((e) => {
          console.log("error  in obtaining the contract ");
        });
      getCustomNetworkWhitelistContract(NetworkChain, Web3ModalRef).then(
        async (contract) => {
          console.log("contract factory is ", contract);
          setWhitelistFactory(contract);
        }
      );
    }
  }

  useEffect(() => {
    init();
  }, [Blockchain, owner]);

  return (
    <>
      {deployedAddress === null && (
        <Box bg={"black"} width={"100vw"} height={"100vh"}>
          {formStep == 1 && (
            <Card>
              <VStack height={"80vh"} justify={"center"}>
                <Heading color={textColor} paddingBottom={"5vh"}>
                  Create Sale
                </Heading>
                <VStack spacing={30}>
                  <NamedInput title={"Whitelist"}>
                    {
                      <DropDownMenu
                        key={"whitelisAddress"}
                        selected={
                          whitelistAddress ? whitelistAddress : whitelists[0]
                        }
                        selector={setWhitelistAddress}
                        options={whitelists}
                      />
                    }
                  </NamedInput>

                  <Text color="white">
                    if you have not created whitelist before{" "}
                    <Link href="/CreateWhitelist">
                      <i
                        style={{ textDecoration: "underline", padding: "4px" }}
                      >
                        Create Here
                      </i>
                    </Link>{" "}
                  </Text>

                  <LinkButton
                    onClick={fetchDetails}
                    title={fetching ? "Fetching Detalis..." : `Fetch Details`}
                    color={"green"}
                    variant={"solid"}
                  />
                </VStack>
              </VStack>
            </Card>
          )}
          {formStep == 2 && (
            <Sale
              saleType={"Sale"}
              deploySale={deploySale}
              _name={name}
              _symbol={symbol}
              _owner={owner}
              _baseURI={baseURI}
              _blockchain={Blockchain}
            >
              <NamedInput
                title={`Presale Rate (${
                  Blockchain == "tron"
                    ? "TRX"
                    : Blockchain == "ethereum"
                    ? "ETH"
                    : "MATIC"
                })`}
              >
                <Input
                  key={"presaleRate"}
                  onChange={(e) => {
                    let res = e.target.value;
                    setPresaleMintRate(res);
                  }}
                  variant="outline"
                  defaultValue={presaleMintRate}
                  placeholder={`How Many ${
                    Blockchain == "tron"
                      ? "TRX"
                      : Blockchain == "ethereum"
                      ? "ETH"
                      : "MATIC"
                  }`}
                />
              </NamedInput>
              <NamedInput
                title={`Public Sale Rate (${
                  Blockchain == "tron"
                    ? "TRX"
                    : Blockchain == "ethereum"
                    ? "ETH"
                    : "MATIC"
                })`}
              >
                <Input
                  key={"publicMintRate"}
                  onChange={(e) => {
                    let res = e.target.value;
                    setPublicMintRate(res);
                  }}
                  variant="outline"
                  placeholder={`How Many ${
                    Blockchain == "tron"
                      ? "TRX"
                      : Blockchain == "ethereum"
                      ? "ETH"
                      : "MATIC"
                  }`}
                  defaultValue={publicMintRate}
                />
              </NamedInput>
            </Sale>
          )}

          <VStack
            height={formStep != 2 ? "100vh" : "1px"}
            bg={"black"}
            color={"white"}
            width={"98%"}
            paddingTop={"20vh"}
            align={"center"}
            display={deployedAddress ? "none" : "flex"}
          >
            <Heading>Sale Creation Status</Heading>
            <VStack spacing={5} width="60vw" id="creationStatus"></VStack>
          </VStack>
        </Box>
      )}
      {deployedAddress !== null && (
        <SuccessfulDeployment
          network={NetworkChain}
          address={deployedAddress}
          successful={deployedAddress.toString() == "none" ? false : true}
        />
      )}
    </>
  );
}

export default CreateSale;
