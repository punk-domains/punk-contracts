# Flexi Punk Contracts

Flexi is an alternative Punk TLD Factory which provides TLD owners with more flexibility, especially when it comes to metadata such as the default domain image SVG.

Metadata is stored in a separate contract and TLD owner can change it (except the domain name, of course).

Flexi TLD contract also has a role called "minter", which is an address that is allowed to mint new domains even if the TLD contract is paused.

Another role is the royalty fee updater. Buy default this is the factory owner, but can be changed to any other address.