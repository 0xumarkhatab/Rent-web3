import React, { useEffect, useState } from "react";
import {
  Heading,
  HStack,
  Img,
  Text,
  VStack,
  Wrap,
  Center,
  WrapItem,
} from "@chakra-ui/react";
import FilterMenuItem from "./components/FilterMenuItem";
import DappInformationPopup from "./components/DappInformationPopup";
import { getCustomNetworkWebsiteRentContract } from "../data/WebsiteRent";
import {
  fetchWhitelists,
  getBlockchainSpecificWebsiteRentContract,
} from "../data/Whitelist";
import { fetchSales } from "../data/Sale";
import { fetchDappsContent, getAllDappsUris } from "../data/ipfsStuff";
import { getProviderOrSigner } from "../data/accountsConnection";
import { useRef } from "react";
import { getCurrentConnectedOwner } from "../data/blockchainSpecificExports";

// let NetworkChain = "goerli";
// let Blockchain="ethereum";
let NetworkChain = "nile";
let Blockchain = "tron";

export async function getStaticProps(context) {
  require("dotenv").config();
  return {
    props: { token: process.env.WEB3STORAGE_TOKEN }, // will be passed to the page component as props
  };
}

function ExploreDapps(props) {
  const [currentMenu, setCurrentMenu] = useState("all");
  const [selectedDapp, setSelectedDapp] = useState(null);
  const [allDapps, setAllDapps] = useState([]);
  const [dappCids, setDappCids] = useState([]);
  const [loader, setLoader] = useState(true);
  const [whitelistDeployments, setWhitelistDeployments] = useState([]);
  const [saleDeployments, setSaleDeployments] = useState([]);
  const [owner, setOwner] = useState();
  const [websiteRentContract, setWebsiteRentContract] = useState(null);
  let web3ModalRef = useRef();

  async function fetchUserDeployments(Owner) {
    setLoader(true);
    await fetchWhitelists(
      NetworkChain,
      web3ModalRef,
      Owner,
      setWhitelistDeployments,
      Blockchain
    );
    await fetchSales(
      NetworkChain,
      web3ModalRef,
      Owner,
      setSaleDeployments,
      Blockchain
    );
    setLoader(false);
  }

  let filteredDapps = [];

  allDapps.map((item) => {
    if (item.type == currentMenu || currentMenu == "all") {
      filteredDapps.push(item);
    }
  });

  /**
   *
   * IPFS
   *
   */

  function getAccessToken() {
    return props.token;
  }
  function makeStorageClient() {
    return new Web3Storage({ token: getAccessToken() });
  }

  /**      */
  async function init() {
    await getCurrentConnectedOwner(
      Blockchain,
      NetworkChain,
      web3ModalRef,
      setOwner
    );

    if (!owner) return null;
    await fetchUserDeployments(owner);

    let contract = await getBlockchainSpecificWebsiteRentContract(
      Blockchain,
      NetworkChain,
      web3ModalRef
    );

    let cids = await getAllDappsUris(contract, setDappCids, Blockchain);
    if (cids.length == 0) {
      setLoader(false);
    } else {
      await fetchDappsContent(
        cids,
        setAllDapps,
        NetworkChain,
        web3ModalRef,
        Blockchain
      );
      setLoader(false);
    }

    setWebsiteRentContract(contract);
  }

  useEffect(() => {
    init();
  }, [owner]);
  // console.log("Deployments");
  // console.log("Sales ", saleDeployments);
  // console.log("whitelists", whitelistDeployments);
  // console.log("Filtered Dapps are ", filteredDapps);
  // console.log("loader is ", loader);
  // console.log("cids ", dappCids.length);

  return (
    <>
      <VStack height={"fit-content"} bg="black" textColor={"white"}>
        <Center>
          <VStack>
            <Heading paddingTop={"10vh"} fontSize={"4.5em"} width={"60vw"}>
              Rent Awesome Dapps like You
            </Heading>
            <Text
              fontFamily={"sans-serif"}
              textColor={"grey"}
              fontSize={"18px"}
              width={"60vw"}
            >
              RentWeb3 provides you bunch of Dapps to rent for your NFT
              Collection. Lorem ipsum dolor sit amet consectetur adipisicing
              elit. Temporibus quas nulla consequatur fugiat ducimus ullam,
              laboriosam mollitia adipisci asperiores nisi tempore. Beatae,
              exercitationem rem? Minus nobis eaque iure temporibus quos.
            </Text>
          </VStack>
        </Center>

        <HStack spacing={10}>
          <FilterMenuItem
            title={"all"}
            setter={setCurrentMenu}
            isClicked={currentMenu === "all"}
          />
          <FilterMenuItem
            title={"whitelist"}
            setter={setCurrentMenu}
            isClicked={currentMenu === "whitelist"}
          />
          <FilterMenuItem
            title={"sale"}
            setter={setCurrentMenu}
            isClicked={currentMenu === "sale"}
          />
        </HStack>
        {filteredDapps?.length > 0 ? (
          <Wrap
            padding={"10px"}
            transition={"display 900ms ease-in-out"}
            spacing={10}
          >
            {filteredDapps?.map((item, index) => {
              return (
                <WrapItem
                  key={"wrap" + item.name + index}
                  transition={"all 300ms ease-in-out"}
                  _hover={{
                    transform: "scale(1.05)",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setSelectedDapp({ ...item });
                  }}
                >
                  <VStack key={"item" + item.name}>
                    <Img
                      width={["70vw", "60vw", "40vw"]}
                      objectFit={"contain"}
                      src={item.image}
                      borderRadius={"20px"}
                    />
                    <HStack>
                      {" "}
                      <Text fontSize={"20px"}>{item.name}</Text>
                      {item.rented ? (
                        <Text
                          colorScheme={"white"}
                          variant={"solid"}
                          disabled
                          padding={"10px"}
                        >
                          Rented
                        </Text>
                      ) : (
                        <Text
                          padding={"10px"}
                          colorScheme={"aqua"}
                          variant={"solid"}
                          disabled
                        >
                          Available
                        </Text>
                      )}
                    </HStack>
                  </VStack>
                </WrapItem>
              );
            })}
          </Wrap>
        ) : (
          <Heading fontSize={"24px"} height={"50vh"}>
            {loader && "Loading Available Dapps"}
            {!loader && dappCids.length == 0 && "No Dapps Available"}
          </Heading>
        )}
      </VStack>
      {selectedDapp != null && (
        <DappInformationPopup
          displayToggle={() => setSelectedDapp(null)}
          dapp={selectedDapp}
          sales={saleDeployments.map((item) => item.address)}
          whitelists={whitelistDeployments.map((item) => item.address)}
        />
      )}
    </>
  );
}

export default ExploreDapps;
