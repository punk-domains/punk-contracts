# TLD Factories

Factories are contracts that produce new TLD contracts. Each factory can produce any number of TLDs. In order to avoid TLD name collisions, factories coordinate through the `PunkForbiddenTlds` contract, which holds a list of all existing TLDs and TLDs that are used by other services (ENS & UD).

Each factory contains a TLD template that needs to follow standard TLD methods (see `IBasePunkTLD` interface), but it can implement them in a different way or add new methods.

The first factory to launch was the `standard` factory.

Current TLD Factory contracts:

- Standard TLD Factory (the first and most basic TLD template)
- Flexi TLD Factory (TLDs with custom metadata and a minter role)
- Soulbound TLD Factory (similar to Flexi, but with non-transferable domains)
- Renewable TLD Factory (in the works)

In order to easily resolve domains without being aware of all existing factories, use the unified resolver called `PunkResolver`.
