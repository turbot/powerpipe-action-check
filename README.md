# Powerpipe Check for GitHub Actions

This action runs [Powerpipe](https://powerpipe.io/) benchmarks and controls from [Powerpipe Mods](https://hub.powerpipe.io/).

<img src="images/summary_output.png" width="80%">

When running checks for Infrastructure as Code (IaC) mods, this action will create annotations for any controls in `alarm` state provided they have an [additional dimension](https://powerpipe.io/docs/powerpipe-hcl/control#additional-control-columns--dimensions) providing the file path and a start line number in one of the following formats: `path/filename.ext:23` or `path/name.ext:23-25`.

> Note: In order to create annotations, the workflow job requires `checks: write` and `pull-requests: write` [permissions](https://docs.github.com/en/actions/using-jobs/assigning-permissions-to-jobs).

For a list of IaC mods, please see [IaC mods](https://hub.powerpipe.io/mods?categories=iac).

<img src="images/example_annotations.png" width="80%" />

## Usage

See [action.yml](action.yml).

## Examples

### Run specific controls

```yaml
  - name: Checkout repo
    uses: actions/checkout@v4

  - name: Setup Steampipe
    uses: turbot/steampipe-action-setup@v1
    with:
      plugin-connections: | # setup your steampipe plugin & connections
        connection "aws" {
          plugin     = "aws"
          access_key = "${{ secrets.AWS_ACCESS_KEY_ID }}"
          secret_key = "${{ secrets.AWS_SECRET_ACCESS_KEY }}"
          regions    = ["ap-south-1"]
        }

  - name: Install Powerpipe
    uses: turbot/powerpipe-action-setup@v1

  - name: Start steampipe service # start steampipe service - powerpipe will connect to this running steampipe postgres database
    run: |
      steampipe service start

  - name: Run specific AWS Compliance controls
    uses: turbot/powerpipe-action-check@v1
    with:
      mod-url: https://github.com/turbot/steampipe-mod-aws-compliance
      controls: |
        ebs_volume_unused
        foundational_security_s3_1
```

### Run specific benchmarks

```yaml
  - name: Checkout repo
    uses: actions/checkout@v4

  - name: Setup Steampipe
    uses: turbot/steampipe-action-setup@v1
    with:
      plugin-connections: | # setup your steampipe plugin & connections
        connection "aws" {
          plugin     = "aws"
          access_key = "${{ secrets.AWS_ACCESS_KEY_ID }}"
          secret_key = "${{ secrets.AWS_SECRET_ACCESS_KEY }}"
          regions    = ["ap-south-1"]
        }

  - name: Install Powerpipe
    uses: turbot/powerpipe-action-setup@v1

  - name: Start steampipe service # start steampipe service - powerpipe will connect to this running steampipe postgres database
    run: |
      steampipe service start

  - name: Run specific AWS Compliance benchmarks
    uses: turbot/powerpipe-action-check@v1
    with:
      mod-url: https://github.com/turbot/steampipe-mod-aws-compliance
      benchmarks: |
        cis_v150
        foundational_security_s3
```

### Run benchmarks and controls from multiple mods

```yaml
  - name: Checkout repo
    uses: actions/checkout@v4

  - name: Setup Steampipe
    uses: turbot/steampipe-action-setup@v1
    with:
      plugin-connections: |
        connection "aws_tf" {
          plugin = "terraform"
          configuration_file_paths = [
            "cloud_infra/service_billing/aws/**/*.tf",
            "cloud_infra/service_orders/aws/**/*.tf"
          ]
        }

        connection "gcp_tf" {
          plugin = "terraform"
          configuration_file_paths = [
            "cloud_infra/service_billing/gcp/**/*.tf",
            "cloud_infra/service_orders/gcp/**/*.tf"
          ]
        }

  - name: Start steampipe service # start steampipe service - powerpipe will connect to this running steampipe postgres database
    run: |
      steampipe service start

  - name: Install Powerpipe
    uses: turbot/powerpipe-action-setup@v1

  - name: Run Terraform AWS Compliance control
    uses: turbot/powerpipe-action-check@v1
    with:
      mod-url: https://github.com/turbot/steampipe-mod-terraform-aws-compliance
      controls: |
        ec2_ebs_default_encryption_enabled
      additional-args: '--search-path-prefix=aws_tf'

  - name: Run GCP Terraform Compliance benchmark
    uses: turbot/powerpipe-action-check@v1
    with:
      mod-url: https://github.com/turbot/steampipe-mod-terraform-gcp-compliance
      benchmarks: |
        compute
      additional-args: '--search-path-prefix=gcp_tf'
```

### Use a specific tag version of a mod

```yaml
  - name: Checkout repo
    uses: actions/checkout@v4

  - name: Setup Steampipe
    uses: turbot/steampipe-action-setup@v1
    with:
      plugin-connections: |
        connection "terraform" {
          plugin = "terraform"
          configuration_file_paths = [ "./**/*.tf" ]
        }

  - name: Install Powerpipe
    uses: turbot/powerpipe-action-setup@v1

  - name: Start steampipe service # start steampipe service - powerpipe will connect to this running steampipe postgres database
    run: |
      steampipe service start

  - name: Run Terraform AWS Compliance v0.18 control
    uses: turbot/steampipe-action-check@v1
    with:
      mod-url: https://github.com/turbot/steampipe-mod-terraform-aws-compliance
      mod-branch: v0.18
      controls: |
        ec2_ebs_default_encryption_enabled
```

### Run GitHub Compliance checks

This action can also be used to run benchmarks and controls in mods that don't scan IaC configuration files.

```yaml
  - name: Checkout
    uses: actions/checkout@v4

  - name: Setup Steampipe
    uses: turbot/steampipe-action-setup@v1
    with:
      plugin-connections: |
        connection "github" {
          plugin = "github"
          token  = "${{ secrets.GITHUB_PAT }}"
        }

  - name: Install Powerpipe
    uses: turbot/powerpipe-action-setup@v1

  - name: Start steampipe service # start steampipe service - powerpipe will connect to this running steampipe postgres database
    run: |
      steampipe service start

  - name: Run Powerpipe benchmarks
    uses: turbot/powerpipe-action-check@v1
    with:
      mod-url: https://github.com/turbot/steampipe-mod-github-compliance
      benchmarks: |
        cis_supply_chain_v100_2
        cis_supply_chain_v100_2_3
```

### Run AWS CIS v2.0.0 benchmark

This example uses an [IAM OIDC identity provider](https://aws.amazon.com/blogs/security/use-iam-roles-to-connect-github-actions-to-actions-in-aws/) with an IAM role.

> Note: In order to use OIDC the workflow job will require `id-token: write` permissions. For more information, please see [Adding permission settings](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services#adding-permissions-settings).


```yaml
steps:
  - name: Checkout repo
    uses: actions/checkout@v4

  - name: Setup AWS Credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::1234567890:role/my-role
      aws-region: us-east-1

  - name: Setup Steampipe
    uses: turbot/steampipe-action-setup@v1
    with:
      plugin-connections: |
        connection "aws" {
          plugin = "aws"
        }

  - name: Install Powerpipe
    uses: turbot/powerpipe-action-setup@v1

  - name: Start steampipe service # start steampipe service - powerpipe will connect to this running steampipe postgres database
    run: |
      steampipe service start

  - name: Run Powerpipe benchmark
    uses: turbot/powerpipe-action-check@v1
    with:
      mod-url: https://github.com/turbot/steampipe-mod-aws-compliance
      benchmarks: |
        benchmark.cis_v200
```

### Create Turbot Pipes snapshot

The check results can also be created and uploaded as snapshots to [Turbot Pipes](https://turbot.com/pipes).

A snapshot is a saved view of benchmark and control results and may be shared with other Turbot Pipes users or with anyone that has the link.

Snapshot visibility is set by the `pipes-snapshot-visibility` input:
  - `anyone_with_link` - Snapshot is shareable with anyone.
  - `workspace` - Snapshot is created in the user's default workspace. To save the snapshot to a different location, use `--snapshot-location` in the `additional-args` input.

```yaml
  - name: Checkout repo
    uses: actions/checkout@v4

  - name: Setup AWS Credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::1234567890:role/my-role
      aws-region: us-east-1

  - name: Setup Steampipe
    uses: turbot/steampipe-action-setup@v1
    with:
      plugin-connections: |
        connection "aws" {
          plugin = "aws"
        }

  - name: Install Powerpipe
    uses: turbot/powerpipe-action-setup@v1

  - name: Start steampipe service # start steampipe service - powerpipe will connect to this running steampipe postgres database
    run: |
      steampipe service start

  - name: Run Powerpipe benchmarks
    uses: turbot/powerpipe-action-check@v1
    with:
      mod-url: https://github.com/turbot/steampipe-mod-aws-compliance
      benchmarks: |
        benchmark.cis_v200
      pipes-snapshot-visibility: workspace
      pipes-token: ${{ secrets.PIPES_TOKEN }}
```

### Pass in Powerpipe variables

Variables can be passed into Powerpipe multiple ways, for more information on how to pass in variables and what order they're loaded in, please see [Passing Input Variables](https://powerpipe.io/docs/build/mod-variables#passing-input-variables).


```yaml
  - name: Checkout repo
    uses: actions/checkout@v4

  - name: Setup AWS Credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::1234567890:role/my-role
      aws-region: us-east-1

  - name: Setup Steampipe
    uses: turbot/steampipe-action-setup@v1
    with:
      plugin-connections: |
        connection "aws" {
          plugin = "aws"
        }

  - name: Install Powerpipe
    uses: turbot/powerpipe-action-setup@v1

  - name: Start steampipe service # start steampipe service - powerpipe will connect to this running steampipe postgres database
    run: |
      steampipe service start

  - name: Run AWS Tags benchmarks
    uses: turbot/powerpipe-action-check@v1
    env:
      # Variables can be passed in through env vars
      PP_VAR_mandatory_tags: '["Application", "Environment", "Department", "Owner"]'
    with:
      mod-url: https://github.com/turbot/steampipe-mod-aws-tags
      benchmarks: |
        mandatory
        prohibited
      # Or with CLI flags
      additional-args: "--var 'prohibited_tags=[\"Password\", \"Key\"]'"
```

## Advanced Examples

### Run a control against a DuckDB Backend

Connect to a DuckDB backend and run controls.

```yaml
  - uses: actions/checkout@v4

  - name: Install Powerpipe
    uses: turbot/powerpipe-action-setup@v1

  - name: Run Powerpipe
    run: |
      powerpipe -v

  - name: Run Control
    uses: turbot/powerpipe-action-check@v1
    with:
      mod-url: "https://github.com/pskrbasu/powerpipe-mod-duckdb-demo"
      controls: |
        testing_control
      pipes-snapshot-visibility: 'anyone_with_link'
      pipes-token: "${{ secrets.PIPES_TOKEN }}"
      database: "duckdb:///$(pwd)/test_data/employee.duckdb"
```

### Run a control against a SQLite Backend

Connect to a SQLite backend and run controls.

```yaml
  - uses: actions/checkout@v4

  - name: Install Powerpipe
    uses: turbot/powerpipe-action-setup@v1

  - name: Run Powerpipe
    run: |
      powerpipe -v

  - name: Run Control
    uses: turbot/powerpipe-action-check@v1
    with:
      mod-url: "https://github.com/pskrbasu/powerpipe-mod-sqlite-demo"
      controls: |
        testing_control
      pipes-snapshot-visibility: 'anyone_with_link'
      pipes-token: "${{ secrets.PIPES_TOKEN }}"
      database: "duckdb:///$(pwd)/test_data/employee.db"
```

### Run checks in a Turbot Pipes workspace

You can execute queries via Turbot Pipes, which is useful if you already have plugin connections setup in your workspaces.

The following example shows how to specify an [implicit workspace](https://powerpipe.io/docs/run/workspaces#implicit-workspaces) within the `additional-args` input.

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v4

  - name: Setup Steampipe
    uses: turbot/steampipe-action-setup@v1
    with:
      plugin-connections: |
        connection "aws" {
          plugin = "aws"
        }

  - name: Install Powerpipe
    uses: turbot/powerpipe-action-setup@v1

  - name: Start steampipe service # start steampipe service - powerpipe will connect to this running steampipe postgres database
    run: |
      steampipe service start

  - name: Run Powerpipe control
    uses: turbot/powerpipe-action-check@v1
    with:
      mod-url: https://github.com/turbot/steampipe-mod-aws-compliance
      controls: |
        ebs_volume_unused
      pipes-token: ${{ secrets.PIPES_TOKEN }}
      pipes-snapshot-visibility: workspace
      # The workspace passed here in format <owner>/<workspace> needs to be accessible by your pipes-token
      additional-args: '--workspace="username/default"'
```

You can also set the workspace via the `POWERPIPE_WORKSPACE` environment variable.

```yaml
  - name: Run Powerpipe control
    uses: turbot/powerpipe-action-check@v1
    env:
      POWERPIPE_WORKSPACE: 'username/default'
    with:
      mod-url: https://github.com/turbot/steampipe-mod-aws-compliance
      controls: |
        ebs_volume_unused
      pipes-token: ${{ secrets.PIPES_TOKEN }}
      pipes-snapshot-visibility: workspace
```

### Use a matrix to run controls from multiple mods

```yaml
jobs:
  powerpipe-terraform-compliance:
    strategy:
      matrix:
        include:
          - cloud: "aws"
            control: "ec2_ami_copy_encrypted_with_kms_cmk"
            search_path: "aws_tf"
          - cloud: "azure"
            control: "compute_managed_disk_set_encryption_enabled"
            search_path: "azure_tf"
          - cloud: "gcp"
            control: "compute_disk_encrypted_with_csk"
            search_path: "gcp_tf"
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Steampipe
        uses: turbot/steampipe-action-setup@v1
        with:
          plugin-connections: |
            connection "aws_tf" {
              plugin = "terraform"
              configuration_file_paths = ["cloud_infra/terraform/aws/**/*.tf"]
            }
            connection "gcp_tf" {
              plugin = "terraform"
              configuration_file_paths = ["cloud_infra/terraform/gcp/**/*.tf"]
            }
            connection "azure_tf" {
              plugin = "terraform"
              configuration_file_paths = ["cloud_infra/terraform/azure/**/*.tf"]
            }

      - name: Install Powerpipe
        uses: turbot/powerpipe-action-setup@v1

      - name: Start steampipe service # start steampipe service - powerpipe will connect to this running steampipe postgres database
        run: |
          steampipe service start

      - name: Run Terraform ${{ matrix.cloud }} Compliance
        uses: turbot/steampipe-action-check@v1
        with:
          mod-url: 'https://github.com/turbot/steampipe-mod-terraform-${{ matrix.cloud }}-compliance'
          controls: |
            ${{ matrix.control }}
          additional-args: '--search-path-prefix=${{ matrix.search_path }}'
```

## Helpful links

- [Powerpipe docs](https://powerpipe.io/docs)
- [Steampipe plugins](https://hub.steampipe.io/plugins)
- [Powerpipe mods](https://hub.powerpipe.io/mods)
