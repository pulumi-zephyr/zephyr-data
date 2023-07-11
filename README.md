# Zephyr Archaeotech Emporium Online Store - Data Infrastructure

This is the source repository for Pulumi code to manage the data infrastructure supporting the online store for Zephyr Archaeotech Emporium. It's used in [Pulumi's Zephyr series of blog posts](https://www.pulumi.com/blog/iac-recommended-practices-code-organization-and-stacks/) to discuss best practices when using Pulumi to manage infrastructure and applications.

## Deploying with Pulumi

### Prerequisites

To deploy this infrastructure with Pulumi, you need to:

* have the Pulumi CLI installed, and ensure you are signed into a backend;
* have NodeJS installed; and
* have the AWS CLI installed and configured for your AWS account.

### Dependencies

This project has a dependency on the base infrastructure managed by the Pulumi code in [the `zephyr-infra` repository](https://github.com/pulumi/zephyr-infra). You will need to have created a stack from that project and run a successful `pulumi up` before starting here. You will also need to know the organization name, project name, and stack name for the stack that manages the base infrastructure. All of this information can be obtained by running `pulumi stack ls` in the directory where the `zephyr-infra` project resides.

### Instructions

Follow these steps to use this Pulumi program to create the data infrastructure for the Zephyr online store:

1. Clone this repository to your local system (if you haven't already).
2. Run `npm install` to install all necessary dependencies.
3. Run `pulumi stack init <name>` to create a new stack. For the smoothest, experience, use the same stack name here that you used with your `zephyr-infra` stack (see the Dependencies section).
4. Set your desired AWS region with `pulumi config set aws:region <region-name>`.
5. (Optional) Use `pulumi config set` to set values for `baseOrgName`, `baseProjName`, and `baseStackName`. These configuration values correspond to the organization, project, and stack where the base infrastructure was deployed. Unless you know you need specific values here, the default values are typically sufficient (the code will default to using your current organization, your current stack name, and the project name "zephyr-infra").
5. Run `pulumi up`.

**NOTE:** You'll see `Pulumi.test.yaml` and `Pulumi.prod.yaml` stack files in this repository. These are here for illustrative purposes (to tie back to the Pulumi blog series) and will not impact your ability to use the steps above _unless_ you use a stack name of "test" or "prod" for your stack.

This Pulumi project deploys two Aurora clusters, each with three database instances. You can view the database endpoints for these clusters using `pulumi stack output` after a successful `pulumi up` run.
