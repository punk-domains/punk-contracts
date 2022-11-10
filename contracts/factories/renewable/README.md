# Renewable punk domains

As opposed to the Standard, Flexi, and Soulbound TLD contract, the Renewable TLD contracts need a Minter and Renewer contract to allow for the full functionality (like public minting). 

Each domain has an expiry date (UNIX timestamp). The Minter contract defines the registration length (in seconds), while the Renewer contract defines how long are renewals (again, in seconds).
