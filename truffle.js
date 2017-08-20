module.exports = {
  rpc: {
    host: 'localhost',
    port: 8545,
    gas: 2000000
  },
  networks: {
    dev: {
      host: "localhost",
      port: 8545,
      network_id: "*"
    }
  },
  migrations_directory: './migrations'
}
