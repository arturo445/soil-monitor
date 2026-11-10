// React.act is unavailable in production; tests must not inherit a production shell.
process.env.NODE_ENV = 'test'
