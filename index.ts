import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Get the current stack name
const currentStackName = pulumi.getStack();

// Grab some values from the Pulumi stack configuration (or use default values)
const config = new pulumi.Config();
const baseOrgName = config.get("baseOrgName") || "zephyr";
const baseProjName = config.get("baseProjName") || "zephyr-infra";
const baseStackName = config.get("baseStackName") || currentStackName;
const platformOrgName = config.get("platformOrgName") || "zephyr";
const platformProjName = config.get("platformProjName") || "zephyr-k8s";
const platformStackName = config.get("platformStackName") || currentStackName;

export = async() => {
    // Create a StackReference and get information from base stack
    const baseSr = new pulumi.StackReference(`${baseOrgName}/${baseProjName}/${baseStackName}`);
    const basePrivateSubnetDetails = await baseSr.getOutputDetails("privSubnetIds");
    const basePrivateSubnetIds = <string[]>basePrivateSubnetDetails.value;
    const baseVpcDetails = await baseSr.getOutputDetails("vpcId");
    const baseVpcId = <string>baseVpcDetails.value;

    // Create a StackReference and get information from platform stack
    const platformSr = new pulumi.StackReference(`${platformOrgName}/${platformProjName}/${platformStackName}`);
    const nodeSecurityGrpDetails = await platformSr.getOutputDetails("nodeSecurityGrp");
    const nodeSecurityGrpId = <string>nodeSecurityGrpDetails.value;

    // Interrogate the AWS API to retrieve information about the subnets
    const numOfAZs = basePrivateSubnetIds.length
    const subnetAZs: string[] = [];
    for (let i = 0; i < numOfAZs; i++) {
        var subnet = await aws.ec2.getSubnet({
            id: basePrivateSubnetIds[i],
        });
        subnetAZs.push(subnet.availabilityZone);
    }

    // Create a DB subnet group
    const dbSubnetGroup = new aws.rds.SubnetGroup("db-subnet-group", {
        subnetIds: basePrivateSubnetIds,
    });

    // Create a security group for the databases
    const dbSecurityGroup = new aws.ec2.SecurityGroup("db-security-group", {
        description: "Manage back-end database traffic",
        vpcId: baseVpcId,
        ingress: [{
            description: "Allow MySQL from EKS nodes",
            fromPort: 3306,
            protocol: "tcp",
            securityGroups: [nodeSecurityGrpId],
            toPort: 3306,
            // Need to find a way to get this from base stack
            // cidrBlocks: ["10.0.0.0/16"],
        }],
        egress: [{
            description: "Allow all outbound",
            fromPort: 0,
            toPort: 0,
            protocol: "-1",
            cidrBlocks: ["0.0.0.0/0"],
        }],
    });

    // Create an Aurora cluster for the catalog service
    const catalogCluster = new aws.rds.Cluster("catalog-cluster", {
        availabilityZones: subnetAZs,
        clusterIdentifier: "catalog-cluster",
        databaseName: "catalog",
        dbSubnetGroupName: dbSubnetGroup.name,
        engine: "aurora-mysql",
        engineVersion: "5.7.mysql_aurora.2.07.1",
        masterUsername: "catalog_master",
        masterPassword: "default_password",
        skipFinalSnapshot: true,
        vpcSecurityGroupIds: [dbSecurityGroup.id],
    });

    // Create multiple instances in catalog-cluster
    const catalogClusterInstances: aws.rds.ClusterInstance[] = [];
    for (let i = 0; i < numOfAZs; i++) {
        catalogClusterInstances.push(new aws.rds.ClusterInstance(`catalog-instance-${i}`, {
            availabilityZone: subnetAZs[i],
            identifier: `catalog-cluster-instance-${i}`,
            clusterIdentifier: catalogCluster.id,
            instanceClass: "db.t3.medium",
            // Need to figure out why it won't use catalogCluster.engine
            engine: "aurora-mysql",
            engineVersion: catalogCluster.engineVersion
        }));
    };

    // Create an Aurora cluster for the orders service
    const ordersCluster = new aws.rds.Cluster("orders-cluster", {
        availabilityZones: subnetAZs,
        clusterIdentifier: "orders-cluster",
        databaseName: "orders",
        dbSubnetGroupName: dbSubnetGroup.name,
        engine: "aurora-mysql",
        engineVersion: "5.7.mysql_aurora.2.07.1",
        masterUsername: "orders_master",
        masterPassword: "default_password",
        skipFinalSnapshot: true,
        vpcSecurityGroupIds: [dbSecurityGroup.id],
    });

    // Create multiple instances in orders-cluster
    const ordersClusterInstances: aws.rds.ClusterInstance[] = [];
    for (let i = 0; i < numOfAZs; i++) {
        ordersClusterInstances.push(new aws.rds.ClusterInstance(`orders-instance-${i}`, {
            availabilityZone: subnetAZs[i],
            identifier: `orders-cluster-instance-${i}`,
            clusterIdentifier: ordersCluster.id,
            instanceClass: "db.t3.medium",
            // Need to figure out why it won't use catalogCluster.engine
            engine: "aurora-mysql",
            engineVersion: ordersCluster.engineVersion
        }));
    };

    // Define some stack outputs
    return { 
        catalogDbEndpoint: catalogCluster.endpoint,
        ordersDbEndpoint: ordersCluster.endpoint,
    };
}
