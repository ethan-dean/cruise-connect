# Database Setup Guides
## Setup Guide to Create an Amazon RDS Free Tier MariaDB Instance
### 1. Sign in to the AWS Management Console
- Go to the [AWS Management Console](https://aws.amazon.com/console/).
- Log in with your AWS credentials.

### 2. Navigate to RDS Service
- In the AWS Management Console, search for **RDS** in the search bar and select **RDS** from the services list.
- This will open the Amazon RDS Dashboard.

### 3. Create Database
- In the RDS Dashboard, click on the **"Create database"** button.

### 4. Choose a Database Creation Method
- Under **"Create database"**, select **Standard Create**.

### 5. Engine Options
- Choose **MariaDB** as the database engine.
- Make sure to select the **Free Tier** option. You can verify this by ensuring the configuration matches the Free Tier specs below:
  - **Instance Class:** `db.t2.micro` or `db.t3.micro` (Free Tier eligible)
  - **Storage:** Up to 20 GB of General Purpose (SSD) storage is Free Tier eligible.

### 6. Database Settings
- **DB Instance Identifier:** Choose a name for your database instance (e.g., `my-mariadb-instance`).
- **Master Username:** Choose a username (default is `admin`).
- **Master Password:** Choose a strong password and confirm it.

### 7. Instance Configuration
- In the **DB instance class**, choose `db.t2.micro` (or `db.t3.micro` if available) to stay within Free Tier limits.
- **Storage type:** Select **General Purpose (SSD)**.
- **Allocated Storage:** Set to 20 GiB (which is Free Tier eligible).

### 8. Availability & Durability
- Leave the **Multi-AZ deployment** option unchecked (not Free Tier eligible).

### 9. Connectivity
- **Virtual Private Cloud (VPC):** Choose the default VPC, or select the appropriate VPC if you've configured one.
- **Subnet group:** Choose the default subnet group.
- **Public access:** Choose **Yes** if you want to allow connections from outside the VPC (useful for development/testing). Choose **No** if you only need private access within AWS.
- **VPC security group:** Create a new security group or select an existing one to control inbound/outbound traffic.
    - **IMPORTANT:** Default group allows AWS instance traffic in, create new inbound rule to allow port 3306 traffic from all IPs(0.0.0.0/0). This should be changed for prod.

### 10. Additional Configuration
- Expand the **Additional configuration** section to customize other settings.
  - **Initial database name:** Provide a name for the initial database if needed (optional).
  - **DB Parameter group:** Leave it as default unless you need specific configurations.
  - **Option group:** Leave it as default.
  - **Backup retention period:** You can set this to 1 day (default) to stay within Free Tier.
  - **Backup window:** Leave default unless you have specific requirements.
  - **Monitoring:** Keep disabled to avoid additional charges.
  - **Maintenance:** Leave the maintenance window settings as default.

### 11. Encryption
- Leave the **Enable encryption** option unchecked (encryption is not part of Free Tier).

### 12. Create Database
- Review your settings to ensure they are within the Free Tier limits.
- Click **"Create database"**.

### 13. Wait for Database Creation
- The database status will show as **Creating**. This process can take a few minutes.
- Once the status changes to **Available**, your MariaDB instance is ready.

### 14. Connect to Your MariaDB Instance
- To connect, go to the **Databases** page in RDS.
- Click on the database name you created.
- Under **Connectivity & security**, note the **Endpoint** (hostname) and **Port**.
- Use a MariaDB client or a tool like MySQL Workbench to connect using:
  - **Hostname/Endpoint**: The endpoint URL you noted.
  - **Port**: Default MariaDB port (3306).
  - **Username**: The username you set up.
  - **Password**: The password you set up.

### Tips to Stay within Free Tier Limits
- Use the **`db.t2.micro`** or **`db.t3.micro`** instance class.
- Use up to **20 GB** of storage.
- Ensure backups and other configurations do not exceed the Free Tier limits.

By following these steps, you should be able to create an Amazon RDS MariaDB instance that falls within the Free Tier parameters. If you need to manage or delete the database, you can do so from the RDS Dashboard.


## Connecting and Configuring Amazon RDS MariaDB Through the Command Line 
### 1. Install MariaDB Client (if not installed)
- To interact with a MariaDB database, you need a MariaDB client installed on your local machine.
- On **Ubuntu**:
  ```bash
  sudo apt-get update
  sudo apt-get install mariadb-client
  ```
- On **MacOS** (if you have Homebrew):
  ```bash
  brew install mariadb
  ```
- On Windows, you can download the MariaDB client here.

### 2. Command Line Connection
- Use the mysql command-line tool to connect to your RDS instance:
  ```bash
  mysql -h <RDS-ENDPOINT> -P 3306 -u <USERNAME> -p
  ```
- Replace:
  - <RDS-ENDPOINT>: The endpoint provided in the RDS dashboard.
  - <USERNAME>: The master username you specified during RDS setup.
- After running the command, you'll be prompted to enter the password.

- Example:
  ```bash
  mysql -h my-mariadb-instance.abcdefghijklm.us-west-2.rds.amazonaws.com -P 3306 -u admin -p
  ```

### 3. Create a Database and User
- Once connected, you can create a database and a user who has full access:
- Create a new database
  ```sql
  CREATE DATABASE my_database;
  ```
- Create a new user and grant permissions
  ```sql
  CREATE USER 'my_user'@'%' IDENTIFIED BY 'secure_password';
  GRANT ALL PRIVILEGES ON my_database.* TO 'my_user'@'%';
  FLUSH PRIVILEGES;
  ```
- Replace:
  - ```my_database```: The name you want for your database.
  - ```my_user```: The username for the new user.
  - ```secure_password```: A strong password for the new user.

### 4. Run SQL Commands
- After creating the database and user, you can run SQL commands:

  ```sql
  SHOW DATABASES;
  USE my_database;
  SHOW TABLES;
  ```
## Connecting Your TypeScript Backend to the RDS MariaDB Using mysql2
### 1. Install the Required Packages
- In your TypeScript backend project, install the mysql2 package along with TypeScript types for Node.js:
  ```bash
  npm install mysql2
  npm install @types/node
  ```

### 2. Create a Connection to the Database
- In the backend:
  ```typescript
  import mysql from 'mysql2';
  // Replace with your RDS configuration details
  const connection = mysql.createConnection({
    host: '<RDS-ENDPOINT>',
    user: '<USERNAME>',
    password: '<PASSWORD>',
    database: '<DATABASE-NAME>',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0,
  });
  ```
- Replace:
  - <RDS-ENDPOINT>: Your Amazon RDS endpoint (e.g., my-mariadb-instance.abcdefghijklm.us-west-2.rds.amazonaws.com).
  - <USERNAME>: The database username.
  - <PASSWORD>: The password for the database user.
  - <DATABASE-NAME>: The name of the database you want to connect to.

### 3. Use the Connection in Your Backend Code
You can now use the connection from database.ts in your database functions!

### Important Notes
- Firewall/Security Groups
  - Make sure the security group associated with your RDS instance allows inbound traffic from your local machine or your server (if hosted) on port 3306.
- Environment Variables
  - To avoid hardcoding sensitive information like passwords, consider using environment variables. Create a .env file:
- Error Handling
  - Ensure you handle connection errors gracefully, especially in production environments.
