# Marketplace publishing setup (Microsoft Entra ID, no PAT)

Goal: let the GitHub Actions release workflow publish to the VS Code Marketplace without a long-lived token.
Mechanism: a user-assigned managed identity in Azure, trusted by GitHub via a federated credential, and added as a Contributor of the Marketplace publisher. The workflow then runs `vsce publish --azure-credential`.

Status markers: steps marked (done) were completed while writing this; steps marked (todo) are still open. Menu labels in Azure change often, so treat them as guidance, not exact text.

Why not a PAT: global Azure DevOps PATs are retired on 2026-12-01 (per the VS Code publishing docs).

## Values used

| What | Value |
|---|---|
| Publisher ID | `ColinMoldenhauer` (must match `publisher` in `package.json`, cannot be changed later) |
| GitHub owner (user) | `ColinMoldenhauer` |
| GitHub owner ID | `103891660` |
| GitHub repository | `vsc-prettify-symbols-mode` |
| GitHub repository ID | `1416749866` |
| Managed identity name | `vsce-publisher-colinmoldenhauer` (any unique label; publisher-wide, so named after the publisher) |
| Resource group | `rg-vsce-publishing` (new) |
| GitHub environment | `marketplace` |
| Federated credential name | `github-vsc-prettify-symbols-mode-marketplace` |
| Audience | `api://AzureADTokenExchange` (default, do not change) |

The owner and repository IDs come from `gh api repos/ColinMoldenhauer/vsc-prettify-symbols-mode -q '{owner_id: .owner.id, repo_id: .id}'`. None of these values are secrets, including the client, tenant and subscription IDs recorded later.

## Step 1 (todo or done): create the Marketplace publisher

Website: https://marketplace.visualstudio.com/manage

1. Sign in with the Microsoft account that also owns the Azure account.
2. Choose **Create publisher**.
3. Publisher ID: `ColinMoldenhauer`. Pick a display name of your choice (for example "Colin Moldenhauer").

This is not done in the Azure portal.

## Step 2 (done): create the managed identity

Website: https://portal.azure.com

1. Search for **Managed Identities**, then **Create**. A subscription is required; a new account normally gets a free trial subscription.
2. **Basics** tab:
   - Subscription: the trial or pay-as-you-go subscription.
   - Resource group: **Create new**, `rg-vsce-publishing`.
   - Region: the region closest to you (for example an EU region). It only stores metadata and cannot be changed later; if creation fails, pick a neighbouring region.
   - Name: `vsce-publisher-colinmoldenhauer`.
   - Isolation scope: **None** (default).
3. **Restrictions** tab: leave **Resource (Preview)** empty. It limits which Azure resources may have the identity assigned, which does not apply to GitHub federation.
4. Review and create. Skip any prompt to add an Azure role or resource; the Reader role from the docs is optional.

## Step 3 (done): add the federated credential

Website: https://portal.azure.com, open the identity, then **Settings** > **Federated credentials** > **Add credential**.

| Field | Value |
|---|---|
| Scenario | GitHub Actions deploying Azure resources |
| Owner ID (organization or user) | `103891660` (numeric, not the user name) |
| Repository ID | `1416749866` (numeric) |
| Entity | **Environment** |
| Environment name | `marketplace` |
| Name | `github-vsc-prettify-symbols-mode-marketplace` |
| Audience | `api://AzureADTokenExchange` (default) |

Resulting subject: `repo:ColinMoldenhauer/vsc-prettify-symbols-mode:environment:marketplace`.

Do not use the **Tag** entity with `v*`: Azure matches the subject exactly and does not support wildcards, so only a tag literally named `v*` would match. The restriction to version tags is done on the GitHub side (Step 4) instead.

## Step 4 (todo): create the GitHub environment

Website: https://github.com/ColinMoldenhauer/vsc-prettify-symbols-mode/settings/environments (or via `gh api`).

1. Create an environment named `marketplace`.
2. Under **Deployment branches and tags**, choose selected branches and tags and add a tag rule `v*`, so only version tags can use this environment (and with it the Azure identity).
3. Optional: add yourself as a required reviewer if you want to approve each Marketplace publish manually.

## Step 5 (todo): record the Azure IDs in GitHub

1. In Azure, open the identity, **Overview**: copy the **Client ID** and **Tenant ID**. The subscription ID is on the subscription's page (search **Subscriptions**).
2. Store them as repository variables (not secrets, they are not sensitive) at https://github.com/ColinMoldenhauer/vsc-prettify-symbols-mode/settings/variables/actions:
   - `AZURE_CLIENT_ID`
   - `AZURE_TENANT_ID`
   - `AZURE_SUBSCRIPTION_ID`

   Or from the command line with the GitHub CLI (`gh auth login` first), replacing the placeholders:

   ```sh
   R=ColinMoldenhauer/vsc-prettify-symbols-mode
   gh variable set AZURE_CLIENT_ID       -R $R -b "<client-id>"
   gh variable set AZURE_TENANT_ID       -R $R -b "<tenant-id>"
   gh variable set AZURE_SUBSCRIPTION_ID -R $R -b "<subscription-id>"
   gh variable list -R $R   # verify
   ```

   The GitHub environment from Step 4 can also be created from the command line:

   ```sh
   gh api -X PUT repos/$R/environments/marketplace \
     -F 'deployment_branch_policy[protected_branches]=false' \
     -F 'deployment_branch_policy[custom_branch_policies]=true'
   gh api -X POST repos/$R/environments/marketplace/deployment-branch-policies -f name='v*' -f type=tag
   ```

## Step 6 (todo): get the identity's Marketplace resource ID (one time)

The Marketplace needs the identity's profile ID, not its Azure client ID. The docs get it with:

```
az rest -u https://app.vssps.visualstudio.com/_apis/profile/profiles/me --resource 499b84ac-1321-427f-aa17-267ca6975798
```

The command has to run signed in as the managed identity, so run it from a temporary GitHub Actions workflow:

1. A temporary workflow with `environment: marketplace`, `permissions: id-token: write`, an `azure/login` step using the three variables from Step 5 (`allow-no-subscriptions: true` if no role is assigned), then the `az rest` command above. Leave `subscription-id` out of the login step: the identity has no Azure role, so it cannot see the subscription and the login fails with "subscription doesn't exist". It has to run from a tag allowed by the environment rule from Step 4 (add a temporary tag rule such as `resolve-id-*` and remove it afterwards).
2. Copy the `id` field from the JSON output.
3. Delete the temporary workflow and tag afterwards.

## Step 7 (todo): authorize the identity on the publisher

Website: https://marketplace.visualstudio.com/manage

1. Open the publisher `ColinMoldenhauer`, then **Members** > **Add**.
2. Enter the `id` from Step 6.
3. Role: **Contributor**.

Scope note: this grants publish rights for all extensions under the publisher. There is no per-extension scoping.

## Step 8 (done): publish from the release workflow

Add a job to `.github/workflows/release.yml` that runs after the build, only for tags without a `-` suffix (the Marketplace rejects prerelease suffixes such as `-dev`):

- `environment: marketplace`
- `permissions: id-token: write, contents: read`
- `azure/login` with the three variables from Step 5
- the same version-from-tag step as the build job, then `npx @vscode/vsce publish --azure-credential` (vsce 2.26.1 or newer)

## Open VSX (done; for VSCodium, Theia, Gitpod and similar)

Separate registry at https://open-vsx.org, token based (no Azure involved).

1. Sign in at https://open-vsx.org with GitHub, link an Eclipse Foundation account and sign the publisher agreement (profile settings).
2. Create an access token in the profile settings.
3. Create the namespace once (it must match the `publisher` in `package.json`): `npx ovsx create-namespace ColinMoldenhauer -p <token>`.
4. Store the token as a secret on the `marketplace` environment (restricts it to `v*` tags):
   `gh secret set OVSX_PAT -R ColinMoldenhauer/vsc-prettify-symbols-mode --env marketplace`
5. The `publish-openvsx` job in `.github/workflows/release.yml` publishes plain `vX.Y.Z` tags with `npx ovsx publish`. Until the secret exists it skips with a notice instead of failing. First published with v2.1.0.

## References

- Publishing guide: https://code.visualstudio.com/api/working-with-extensions/publishing-extension (section on secure automated publishing)
- The documented flow targets Azure DevOps Pipelines; the GitHub Actions variant above (OIDC with `azure/login`) is adapted and has not been verified end to end yet.
- Open VSX listing: https://open-vsx.org/extension/ColinMoldenhauer/prettify-symbols-mode-continued
