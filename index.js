'use strict';

const Dialect = require('./lib/dialect');

const Asynchro = require('asynchro');
const Fs = require('fs');
const { format } = require('util');
const Path = require('path');
const CRUD_TYPES = Object.freeze(['CREATE', 'READ', 'UPDATE', 'DELETE']);
const COMPARE = Object.freeze({
  '=': function eq(x, y) { return x === y; },
  '<': function lt(x, y) { return x < y; },
  '>': function gt(x, y) { return x > y; },
  '<=': function lteq(x, y) { return x <= y; },
  '>=': function gteq(x, y) { return x >= y; },
  '<>': function noteq(x, y) { return x !== y; }
});

/**
 * The `cache` client responsible for regulating the frequency in which a SQL file is read by a {@link Manager}.
 * @typedef {Object} Cache
 * @property {Function} start An `async function()` that starts caching. This could be a `noop` or could start any background processing and/or capture of cached keys (depending on the type of
 * implementation).
 * @property {Function} stop An `async function()` that stops caching. This could be a `noop` or could stop any background processing and/or capture of cached keys (depending on the type of
 * implementation).
 * @property {Function} get An `async function(key)` that gets a corresponding SQL statement from cache using the specified _key_ to uniquily identify the SQL source (typically generated by a {@link Manager}).
 * The returned _object_ will contain the following values when present (otherwise, returns _null_):
 * - `item` - The cached SQL statement
 * - `stored` - The timestamp indicating the time when the SQL statement was stored in cache
 * - `ttl` - The timestamp indicating the remaining time left before the SQL statement will be removed from cache
 * @property {Function} set An `async function(key sql, ttlOverride)` that sets a SQL statement in cache, overriding the _time-to-live__ (in milliseconds) that may have been set by a {@link Manager}.
 * @property {Function} drop An `async function(key)` that removes the specified key from cache
 * @example
 * // cache options can be different depending on the needs of the implementing cache
 * const cacheOpts = {
 *  "expiresIn": 60000
 * };
 * // simple interval cache for illustration purposes
 * const bank = { store: {}, handles: {} };
 * const cache = {
 *  start: async () => {
 *    let cached, calTtl;
 *    for (let key in bank.handles) {
 *      clearInterval(bank.handles[key]);
 *      cached = bank.store.hasOwnProperty(key) ? bank.store[key] : null;
 *      calTtl = !cached|| isNaN(cached.ttl) ? cacheOpts.expiresIn : cached.ttl;
 *      bank.handles[key] = setInterval(() => delete bank.store[key], calTtl);
 *    }
 *  },
 *  stop: async () => {
 *    for (let key in bank.handles) {
 *      clearInterval(bank.handles[key]);
 *    }
 *  },
 *  get: async key => {
 *    const cached = bank.store.hasOwnProperty(key) ? bank.store[key] : null;
 *    if (cached) cached.ttl = Date.now() - cached.stored;
 *    return Promise.resolve(cached ? JSON.parse(JSON.stringify(cached)) : cached);
 *  },
 *  set: async (key, val, ttl) => {
 *    if (bank.handles[key]) clearInterval(bank.handles[key]);
 *    const calTtl = !ttl || isNaN(ttl) ? cacheOpts.expiresIn : ttl;
 *    bank.store[key] = { item: val, stored: Date.now(), ttl: calTtl };
 *    bank.handles[key] = setInterval(sql => delete bank.store[key], calTtl);
 *    return Promise.resolve();
 *  },
 *  drop: async () => {
 *    if (bank.handles[key]) {
 *      clearInterval(bank.handles[key]);
 *      delete bank.handles[key];
 *    }
 *    if (bank.store[key]) delete bank.store[key];
 *  }
 * };
 * 
 * // manager configuration
 * const conf = {
 *  // other required conf options here
 *  "db": {
 *    "connections": [
 *      {
 *        // other required connection conf options here
 *      }
 *    ]
 *  }
 * };
 * 
 * const mgr = new Manager(conf, cache);
 * await mgr.init();
 * // use the manager to execute SQL files that will
 * // be refreshed/re-read every 60 seconds
 */

 /**
  * Options that are passed to generated/prepared SQL functions
  * @typedef {Object} Manager~ExecOptions
  * @property {String} [type] The type of CRUD operation that is being executed (i.e. `CREATE`, `READ`, `UPDATE`, `DELETE`). __Mandatory only when the
  * generated/prepared SQL function was generated from a SQL file that was not prefixed with a valid CRUD type.__
  * @property {Object} [binds] The key/value pair of replacement parameters that will be bound in the SQL statement
  * @property {Integer} [numOfIterations] The number of times the SQL should be executed. When supported, should take less round-trips back to the DB
  * rather than calling generated SQL functions multiple times.
  * @property {Boolean} [returnErrors] A flag indicating that any errors that occur during execution should be returned rather then thrown
  */
 // TODO : @param {String} [locale] The [BCP 47 language tag](https://tools.ietf.org/html/bcp47) locale that will be used for formatting dates contained in the `opts` bind variable values (when present)

 /**
  * Generated/prepared SQL function
  * @async
  * @callback {Function} Manager~PreparedFunction
  * @param {Manager~ExecOptions} [opts] The SQL execution options
  * @param {String[]} [frags] Consists of any fragment segment names present in the SQL being executed that will be included in the final SQL statement. Any fragments present
  * in the SQL source will be excluded from the final SQL statement when there is no matching fragment name.
  * @returns {(Object[] | undefined | Error)} The result set of dynamically generated result models, undefined when executing a non-read SQL statement or an `Error` when
  * `opts.returnErrors` is _true_.
  */

/**
 * The database(s) manager entry point that autogenerates/manages SQL execution functions from underlying SQL statement files.
 * Vendor-specific implementations should implement {@link Dialect} and pass the class or module path into the constructor as `conf.db.dialects.myDialectClassOrModulePath`.
 * See [README.md](index.html) for more details about SQL related features.
 */
class Manager {

  /**
  * Creates a new database manager. Vendor-specific implementations should have constructors that accept properties defined by {@link Dialect}.
  * @param {Object} conf the configuration
  * @param {String} [conf.mainPath=require.main] root directory starting point to look for SQL files (defaults to `require.main` path or `process.cwd()`)
  * @param {String} [conf.privatePath=process.cwd()] current working directory where generated files will be located (if any)
  * @param {Object} conf.univ the universal configuration that, for security and sharing puposes, remains external to an application
  * @param {Object} conf.univ.db the database configuration that contains connection ID objects that match the connection IDs of each of the `conf.db.connections` - each connection object should contain a
  * "host", "username" and "password" property that will be used to connect to the underlying database (e.g. { db: myConnId: { host: "someDbhost.example.com", username: 'someUser', password: 'somePass' } })
  * @param {Object} conf.db the database configuration
  * @param {Object} conf.dialects an object that contains dialect implementation details where each property name matches a dialect name and the value contains either the module class or a string that points to the
  * a {@link Dialect} implementation for the given dialect (e.g. `{ dialects: { 'oracle': 'sqler-oracle' } }`). When using a directory path the dialect path will be prefixed with `process.cwd()` before loading.
  * @param {Object[]} conf.db.connections the connections that will be configured
  * @param {String} conf.db.connections[].id identifies the connection within the passed `conf.univ.db`
  * @param {String} conf.db.connections[].name the name given to the database used as the property name on the {@link Manager} to access generated SQL functions (e.g. `name = 'example'` would result in a SQL function
  * connection container `manager.example`). The _name_ will also be used as the _cwd_ relative directory used when no dir is defined
  * @param {String} [conf.db.connections[].dir=connection.name] the alternative dir where `*.sql` files will be found relative to `mainPath`. The directory path will be used as the basis for generating SQL statements
  * from discovered SQL files. Each will be made accessible in the manager by name followed by an object for each name separated by period(s)
  * within the file name with the last entry as the executable {@link Manager~PreparedFunction}. For example, a connection named "conn1" and a SQL file named "user.team.details.sql" will be accessible within the manager
  * as "mgr.db.conn1.user.team.details()". But when `dir` is set to "myDir" the SQL files will be loaded from the "myDir" directory (relative to `mainPath`) instead of the default directory that matches the connection name
  * "conn1".
  * @param {Float} [conf.db.connections[].version] a version that can be used for replacement selection within the SQL (see `binds` section for more details)
  * @param {String} [conf.db.connections[].service] the service name defined by the underlying database (must define if SID is not defined)
  * @param {String} [conf.db.connections[].sid] the SID defined by the underlying database (use only when supported, but service is preferred)
  * @param {Object} [conf.db.connections[].binds] global object that contains parameter values that will be included in all SQL calls made under the connection for parameter `binds` if not overridden
  * by individual "binds" passed into the SQL function
  * @param {Object} [conf.db.connections[].substitutes] key/value pairs that define global/static substitutions that will be made in prepared statements by replacing occurances of keys with corresponding values
  * @param {Object} conf.db.connections[].sql the object that contains the SQL connection options (excluding username/password)
  * @param {String} [conf.db.connections[].sql.host] the database host override from conf.univ.db
  * @param {String} conf.db.connections[].sql.dialect the database dialect (e.g. mysql, mssql, oracle, etc.)
  * @param {Object} [conf.db.connections[].sql.dialectOptions] options for the specified dialect passed directly into the {@link Dialect} driver
  * @param {Object} [conf.db.connections[].sql.pool] the connection pool options
  * @param {Integer} [conf.db.connections[].sql.pool.max] the maximum number of connections in the pool
  * @param {Integer} [conf.db.connections[].sql.pool.min] the minumum number of connections in the pool
  * @param {Integer} [conf.db.connections[].sql.pool.idle] the maximum time, in milliseconds, that a connection can be idle before being released
  * @param {String[]} [conf.db.connections[].log] additional logging parameters passed to the `infoLogger`/`errorLogger` function log activity (will also append additional names that identify the connection)
  * @param {Cache} [cache] the {@link Cache} __like__ instance that will handle the logevity of the SQL statement before the SQL statement is re-read from the SQL file
  * @param {(Function | Boolean)} [logging] the `function(dbNames)` that will return a name/dialect specific `function(obj1OrMsg [, obj2OrSubst1, ..., obj2OrSubstN]))` that will handle database logging
  * (pass `true` to use the console)
  */
  constructor(conf, cache, logging) {
    if (!conf) throw new Error('Database configuration is required');
    if (!conf.db.dialects) throw new Error('Database configuration.dialects are required');
    const mgr = internal(this), connCnt = conf.db.connections.length, mainPath = conf.mainPath || (require.main && require.main.filename.replace(/([^\\\/]*)$/, '')) || process.cwd();
    const privatePath = conf.privatePath || process.cwd();
    const ns = 'db';
    mgr.this[ns] = {};
    mgr.at.sqls = new Array(connCnt);
    mgr.at.logError = logging === true ? generateLogger(console.error, ['db', 'error']) : (logging && logging(['db', 'error'])) || console.error;
    mgr.at.log = logging === true ? generateLogger(console.log, ['db']) : (logging && logging(['db'])) || console.log;
    //const reserved = Object.getOwnPropertyNames(Manager.prototype);
    for (let i = 0, conn, def, dbx, dlct, track = {}; i < connCnt; ++i) {
      conn = conf.db.connections[i];
      if (!conn.id) throw new Error(`Connection at index ${i} must have and "id"`);
      def = conf.univ.db[conn.id]; // pull host/credentials from external conf resource
      if (!def) throw new Error(`Connection at index ${i} has invalid "id": ${conn.id}`);
      conn.sql.host = conn.sql.host || def.host;
      dlct = conn.sql.dialect.toLowerCase();
      if (!conf.db.dialects.hasOwnProperty(dlct)) {
        throw new Error(`Database configuration.db.dialects does not contain an implementation definition/module for ${dlct} at connection index ${i}/ID ${conn.id} for host ${conn.sql.host}`);
      }
      if (typeof conf.db.dialects[dlct] === 'string') {
        if (/^[a-z@]/i.test(conf.db.dialects[dlct])) conf.db.dialects[dlct] = require(conf.db.dialects[dlct]);
        else conf.db.dialects[dlct] = require(Path.join(process.cwd(), conf.db.dialects[dlct]));
      }
      //if (!(conf.db.dialects[dlct] instanceof Dialect)) throw new Error(`Database dialect for ${dlct} is not an instance of a sqler "${Dialect.constructor.name}" at connection index ${i}/ID ${conn.id} for host ${conn.sql.host}`);
      if (conn.sql.log !== false && !conn.sql.log) conn.sql.log = [];
      if (conn.sql.logError !== false && !conn.sql.logError) conn.sql.logError = [];
      if (conn.sql.log !== false) {
        let ltags = [...conn.sql.log, 'db', conn.name, dlct, conn.service, conn.id, `v${conn.version || 0}`];
        conn.sql.logging = logging === true ? generateLogger(console.log, ltags) : logging && logging(ltags); // override dbx non-error logging
      }
      if (conn.sql.logError !== false) {
        let ltags = [...conn.sql.logError, 'db', conn.name, dlct, conn.service, conn.id, `v${conn.version || 0}`];
        conn.sql.errorLogging = logging === true ? generateLogger(console.error, ltags) : logging && logging(ltags); // override dbx error logging
      }
      dbx = new conf.db.dialects[dlct](def.username, def.password, conn.sql, conn.service, conn.sid, privatePath, track, conn.sql.errorLogging, conn.sql.logging, conf.debug);
      // prepared SQL functions from file(s) that reside under the defined name and dialect (or "default" when dialect is flagged accordingly)
      if (mgr.this[ns][conn.name]) throw new Error(`Database connection ID ${conn.id} cannot have a duplicate name for ${conn.name}`);
      //if (reserved.includes(conn.name)) throw new Error(`Database connection name ${conn.name} for ID ${conn.id} cannot be one of the following reserved names: ${reserved}`);
      mgr.at.sqls[i] = new SQLS(mainPath, cache, conn.preparedSql, (mgr.this[ns][conn.name] = {}), new DBS(dbx, conf, conn), conn);
    }
  }

  /**
   * Initializes the defined database connections
   * @returns {Object} An object that contains a property name that matches each connection that was processed (the property value is the number of operations processed per connection)
   */
  async init() {
    const mgr = internal(this);
    if (mgr.at.sqlsCount) throw new Error(`${mgr.at.sqlsCount} database(s) already initialized`);
    const rslt = await operation(mgr, 'init');
    mgr.at.sqlsCount = Object.getOwnPropertyNames(rslt).length;
    mgr.at.log(`${mgr.at.sqlsCount} database(s) are ready for use`);
    return mgr.at.sqlsCount;
  }

  /**
   * Commit the current transaction(s) in progress on either all the connections used by the manager or on the specified connection names.
   * @param {Object} [opts={}] The operational options
   * @param {Object} [opts.connections] An object that contains connection names as properties. Each optionally containing an object with `executeInSeries` that will override
   * any global options set directly on `opts`. For example, `opts.connections.myConnection.executeInseries` would override `opts.executeInSeries` for the connection named `myConnection`,
   * but would use `opts.executeInSeries` for any other connections that ae not overridden.
   * @param {Boolean} [opts.executeInSeries] Set to truthy to execute the operation in series, otherwise executes operation in parallel
   * @param {...String} [connNames] The connection names to perform the commit on (defaults to all connections)  
   * @returns {Object} An object that contains a property name that matches each connection that was processed (the property value is the number of operations processed per connection)
   */
  async commit(opts, ...connNames) {
    return operation(internal(this), 'commit', opts, connNames);
  }

  /**
   * Rollback the current transaction(s) in progress on either all the connections used by the manager or on the specified connection names.
   * @param {Object} [opts={}] The operational options
   * @param {Object} [opts.connections] An object that contains connection names as properties. Each optionally containing an object with `executeInSeries` that will override
   * `opts.executeInSeries`
   * @param {Boolean} [opts.executeInSeries] Set to truthy to execute the operation in series, otherwise executes operation in parallel
   * @param {...String} [connNames] The connection names to perform the commit on (defaults to all connections)  
   * @returns {Object} An object that contains a property name that matches each connection that was processed (the property value is the number of operations processed per connection)
   */
  async rollback(opts, ...connNames) {
    return operation(internal(this), 'rollback', opts, connNames);
  }

  /**
   * Closes all database pools/connections/etc.
   * @returns {Object} An object that contains a property name that matches each connection that was processed (the property value is the number of operations processed per connection)
   */
  async close() {
    return operation(internal(this), 'close');
  }

  /**
   * @returns {String[]} The operation types
   */
  static get OPERATION_TYPES() {
    return CRUD_TYPES;
  }
}

/**
 * Executes one or more {@link SQLS} functions
 * @private
 * @param {Manager} mgr The _internal_/private {@link Manager} store
 * @param {String} funcName The async function name to call on each {@link SQLS} instance
 * @param {Object} [opts={}] The operational options
 * @param {Object} [opts.connections] An object that contains connection names as properties. Each optionally containing an object with `executeInSeries` that will override
 * `opts.executeInSeries`
 * @param {Boolean} [opts.executeInSeries] Set to truthy to execute the operation in series, otherwise executes operation in parallel
 * @param {String[]} [connNames] The connection names to perform the commit on (defaults to all connections)
 * @returns {Object} The result from Asynchro
 */
async function operation(mgr, funcName, opts, connNames) {
  opts = opts || {};
  const cnl = (connNames && connNames.length) || 0;
  const ax = new Asynchro({}, true);
  const queue = sqli => {
    const func = () => {
      return sqli[funcName]();
    };
    const hasOverride = opts.connections && opts.connections[name] && typeof opts.connections[name] === 'object' && opts.connections[name].hasOwnProperty('executeInSeries');
    if (hasOverride ? opts.connections[name].executeInSeries : opts.executeInSeries) {
      ax.series(sqli.connectionName, func);
    } else {
      ax.parallel(sqli.connectionName, func);
    }
  }
  for (let i = 0, l = mgr.at.sqls.length; i < l; ++i) {
    if (cnl) {
      if (!connNames.includes(mgr.at.sqls[i].connectionName)) continue;
      queue(mgr.at.sqls[i]);
    } else queue(mgr.at.sqls[i]);
  }
  return ax.run();
}

/**
 * Reads all the perpared SQL definition files for a specified name directory and adds a function to execute the SQL file contents
 * @private
 */
class SQLS {

  /**
   * Reads all the prepared SQL definition files for a specified name directory and adds a function to execute the SQL file contents
   * @constructs SQLS
   * @param {String} sqlBasePth the absolute path that SQL files will be included
   * @param {Cache} [cache] the {@link Cache} __like__ instance that will handle the logevity of the SQL statement before the SQL statement is re-read from the SQL file
   * @param {Object} psopts options for prepared statements
   * @param {Object} psopts.substitutes key/value pairs that define global/static substitutions that will be made in prepared statements by replacing occurances of keys with corresponding values
   * @param {Object} db the object where SQL retrieval methods will be stored (by file name parts separated by a period- except the file extension)
   * @param {DBS} dbs the database service to use
   * @param {Object} conn the connection configuration
   */
  constructor(sqlBasePth, cache, psopts, db, dbs, conn) {
    if (!conn.name) throw new Error(`Connection ${conn.id} must have a name`);

    const sqls = internal(this);
    sqls.at.connectionName = conn.name;
    sqls.at.basePath = Path.join(sqlBasePth, conn.dir || conn.name);
    sqls.at.cache = cache;
    sqls.at.subs = psopts && psopts.substitutes;
    sqls.at.subrxs = sqls.at.subs && [];
    sqls.at.db = db;
    sqls.at.dbs = dbs;
    sqls.at.conn = conn;
    if (sqls.at.subs) for (let key in sqls.at.subs) sqls.at.subrxs.push({ from: new RegExp(key, 'g'), to: sqls.at.subs[key] }); // turn text value into global regexp
  }

  /**
   * Initializes the SQL paths
   */
  async init() {
    const sqls = internal(this);
    sqls.at.numOfPreparedStmts = 0;
    const prepare = async (cont, pnm, pdir) => {
      let pth, proms = [];
      try {
        cont = cont || sqls.at.db;
        pdir = pdir || sqls.at.basePath;
        const files = await Fs.promises.readdir(pdir);
        for (let fi = 0, stat, nm, ns, ext; fi < files.length; ++fi) {
          pth = Path.resolve(pdir, files[fi]);
          stat = await Fs.promises.stat(pth);
          if (stat && stat.isDirectory()) {
            nm = files[fi].replace(/[^0-9a-zA-Z]/g, '_');
            proms.push(prepare(cont[nm] = {}, `${pnm ? `${pnm}_` : ''}${nm}`, pth));
            continue;
          }
          nm = files[fi].replace(/[^0-9a-zA-Z\.]/g, '_');
          ns = nm.split('.');
          ext = ns.length > 1 ? ns.pop() : '';
          nm = `${sqls.at.conn.sql.dialect}_${sqls.at.conn.name}_${pnm ? `${pnm}_` : ''}${ns.join('_')}`;
          for (let ni = 0, nl = ns.length, so = cont; ni < nl; ++ni) {
            so[ns[ni]] = so[ns[ni]] || (ni < nl - 1 ? {} : await sqls.this.prepared(nm, pth, ext));
            so = so[ns[ni]];
          }
        }
        await Promise.all(proms);
      } catch (err) {
        if (sqls.at.conn.sql.erroLogging) sqls.at.conn.sql.erroLogging(`Failed to build SQL statements from files in directory ${pth || pdir}`, err);
        throw err;
      }
    };
    await prepare();
    return sqls.at.dbs.init({ numOfPreparedStmts: sqls.at.numOfPreparedStmts });
  }

  /**
   * Generates a function that will execute a pre-defined SQL statement contained within a SQL file (and handle caching of that file)
   * @param {String} name the name of the SQL (excluding the extension)
   * @param {String} fpth the path to the SQL file to execute
   * @param {String} ext the file extension that will be used
   * @returns {Manager~PreparedFunction} an `async function` that executes SQL statement(s)
   */
  async prepared(name, fpth, ext) {
    const sqls = internal(this);
    if (sqls.at.conn.sql.logging) sqls.at.conn.sql.logging(`Generating prepared statement for ${fpth} at name ${name}`);
    let crud = Path.parse(fpth).name.match(/[^\.]*/)[0].toUpperCase();
    if (!CRUD_TYPES.includes(crud)) crud = null;
    if (sqls.at.conn.sql.logging) {
      sqls.at.conn.sql.logging(`Generating prepared statement for ${fpth} at name ${name}${
        crud ? '' : ` (statement execution must include "opts.type" set to one of ${OPERATION_TYPES.join(',')} since the SQL file path is not prefixed with the type)`}`);
    }
    // cache the SQL statement capture in order to accommodate dynamic file updates on expiration
    sqls.at.stms = sqls.at.stms || { methods: {} };
    sqls.at.stms.methods[name] = {};
    if (sqls.at.cache) {
      const id = `sqler:db:${name}${ext ? `:${ext}` : ''}`;
      sqls.at.stms.methods[name][ext] = async function cachedSql(opts, execFn) { // execute the SQL statement with cached statements
        let sql;
        const cached = await sqls.at.cache.get(id);
        if (!cached || !cached.item) {
          if (sqls.at.conn.sql.logging) sqls.at.conn.sql.logging(`Refreshing cached ${fpth} at ID ${id}`);
          sql = await readSqlFile();
          sqls.at.cache.set(id, sql); // no need to await set
        } else sql = cached.item;
        return await execFn(sql);
      };
    } else {
      if (sqls.at.conn.sql.logging) sqls.at.conn.sql.logging(`Setting static ${fpth} at "${name}"`);
      const sql = await readSqlFile();
      sqls.at.stms.methods[name][ext] = async function staticSql(opts, execFn) { // execute the SQL statement with static statements
        return await execFn(sql);
      };
    }
    sqls.at.numOfPreparedStmts++;

    /**
     * @returns {String} the SQL contents from the SQL file
     */
    async function readSqlFile() {
      var data = await Fs.promises.readFile(fpth, { encoding: 'utf8' });
      if (data && sqls.at.subrxs) for (let i = 0, l = sqls.at.subrxs.length; i < l; ++i) data = data.replace(sqls.at.subrxs[i].from, sqls.at.subrxs[i].to); // substitutions
      const dt = ext === 'json' ? JSON.parse(data.toString('utf8').replace(/^\uFEFF/, '')) : data; // when present, replace BOM before parsing JSON result
      return dt || data;
    }

    /**
    * Sets/formats SQL parameters and executes an SQL statement
    * @see Manager~PreparedFunction
    */
    return async function execSqlPublic(opts, frags) {
      const binds = {}, mopt = { binds, opts: frags };
      if (!crud && (!opts || !opts.type || !opts.type)) {
        return Promise.reject(new Error(`statement execution must include "opts.type" set to one of ${OPERATION_TYPES.join(',')} since the SQL file path was not prefixed with the type`));
      }
      if (sqls.at.conn.binds) for (let i in sqls.at.conn.binds) {
        if (!opts || !opts.binds || !opts.binds.hasOwnProperty(i)) {
          binds[i] = sqls.at.conn.binds[i]; // add per connection static parameters when not overridden
        }
      }
      if (opts && opts.binds) {
        for (let i in opts.binds) {
          binds[i] = (opts.binds[i] instanceof Date && opts.binds[i].toISOString()) || opts.binds[i]; // convert dates to ANSI format for use in SQL
        }
      }
      return await sqls.at.stms.methods[name][ext](mopt, sqls.this.genExecSqlFromFileFunction(fpth, opts.type || crud, binds, frags));
    };
  }

  genExecSqlFromFileFunction(fpth, type, binds, frags) {
    const sqls = internal(this), opts = { type, binds };
    return async function execSqlFromFile(sql) {
      return await sqls.at.dbs.exec(fpth, sql, opts, frags);
    };
  }

  /**
   * Iterates through and commits the different database connection transactions
   */
  async commit() {
    return internal(this).at.dbs.commit();
  }

  /**
   * Iterates through and rollback the different database connection transactions
   */
  async rollback() {
    return internal(this).at.dbs.rollback();
  }

  /**
   * Iterates through and terminates the different database connection pools
   */
  async close() {
    return internal(this).at.dbs.close();
  }

  /**
   * @returns {Integer} the number of prepared statements found in SQL files
   */
  get numOfPreparedStmts() {
    return internal(this).at.numOfPreparedStmts || 0;
  }

  /**
   * @returns {String} the connection name associated with the {@link SQLS} instance
   */
  get connectionName() {
    return internal(this).at.connectionName;
  }
}

/**
 * Database service
 * @private
 */
class DBS {

  /**
   * Database service constructor
   * @constructs DBS
   * @param {Object} dbx the database service implementation/executor to use
   * @param {Object} conf the application configuration profile
   * @param {Object} [conn] the connection configuration
   */
  constructor(dbx, conf, conn) {
    const dbs = internal(this);
    dbs.at.dbx = dbx;
    dbs.at.conf = conf;
    dbs.at.conn = conn;
    dbs.at.errorLogging = conn.sql.errorLogging;
    dbs.at.logging = conn.sql.logging;
    dbs.at.dialect = conn.sql.dialect.toLowerCase();
    dbs.at.version = conn.version || 0;
    dbs.at.pending = 0;
  }

  /**
   * Initializes the database service
   * @param {Object} [opts] initializing options passed into the underlying database implementation/executor
   * @returns {Object} the connection pool
   */
  async init(opts) {
    const dbs = internal(this);
    return await dbs.at.dbx.init(opts);
  }

  /**
  * Executes SQL using the underlying framework API
  * @param {String} fpth The originating file path where the SQL resides
  * @param {String} sql The SQL to execute with optional substitutions {@link DBS#frag}
  * @param {Manager~ExecOptions} opts The eectution options
  * @param {String[]} frags The frament keys within the SQL that will be retained
  * @returns {(Object[] | undefined | Error)} The execution results, `undefined` when not perfroming a read or an error when `opts.returnErrors` is true
  */
  async exec(fpth, sql, opts, frags) {
    const dbs = internal(this);
    const sqlf = dbs.this.frag(sql, frags, opts.binds);
    // framework that executes SQL may output SQL, so, we dont want to output it again if logging is on
    if (dbs.at.logging) {
      dbs.at.logging(`Executing SQL ${fpth} with options ${JSON.stringify(opts)}${frags ? ` framents used ${JSON.stringify(frags)}` : ''}`);
    }
    let rslt;
    try {
      dbs.at.pending += opts.type === 'READ' ? 0 : 1;
      rslt = await dbs.at.dbx.exec(sqlf, generateDbsOpts(dbs, opts), frags); // execute the prepared SQL statement
    } catch (err) {
      if (dbs.at.errorLogging) {
        dbs.at.errorLogging(`SQL ${fpth} failed ${err.message || JSON.stringify(err)} (options: ${JSON.stringify(opts)}, connections: ${dbs.at.dbx.lastConnectionCount || 'N/A'}, in use: ${dbs.at.dbx.lastConnectionInUseCount || 'N/A'})`);
      }
      if (opts.returnErrors) return err;
      else throw err;
    }
    if (dbs.at.logging) {
      dbs.at.logging(`SQL ${fpth} returned with ${(rslt && rslt.length) || 0} records (options: ${JSON.stringify(opts)}, connections: ${dbs.at.dbx.lastConnectionCount || 'N/A'}, in use: ${dbs.at.dbx.lastConnectionInUseCount || 'N/A'})`);
    }
    return rslt;
  }

  /**
  * Removes any SQL fragments that are wrapped around [[? someKey]] and [[?]] when the specified keys does not contain the discovered key (same for dialect and version keys)
  * Replaces any SQL parameters that are wrapped around :someParam with the indexed parameter names (i.e. :someParam :someParam1 ...) and adds the replacement value to the supplied `binds`
  * @param {String} sql the SQL to defragement
  * @param {String[]} [keys] fragment keys which will remain intact within the SQL
  * @param {Object} [rplmts] an object that contains the SQL parameterized `binds` that will be used for parameterized array composition
  * @returns {String} the defragmented SQL
  */
  frag(sql, keys, rplmts) {
    if (!sql) return sql;
    const dbs = internal(this);
    sql = sql.replace(/(:)([a-z]+[0-9]*?)/gi, function sqlArrayRpl(match, pkey, key) {
      for (var i = 0, vals = key && rplmts && Array.isArray(rplmts[key]) && rplmts[key], keys = '', l = vals && vals.length; i < l; ++i) {
        keys += ((keys && ', ') || '') + pkey + key + (i || '');
        rplmts[key + (i || '')] = vals[i];
      }
      return keys || (pkey + key);
    });
    sql = sql.replace(/((?:\r?\n|\n)*)-{0,2}\[\[\!(?!\[\[\!)\s*(\w+)\s*\]\](?:\r?\n|\n)*([\S\s]*?)-{0,2}\[\[\!\]\]((?:\r?\n|\n)*)/g, function sqlDiaRpl(match, lb1, key, fsql, lb2) {
      return (key && key.toLowerCase() === dbs.at.dialect && fsql && (lb1 + fsql)) || ((lb1 || lb2) && ' ') || '';
    });
    sql = sql.replace(/((?:\r?\n|\n)*)-{0,2}\[\[version(?!\[\[version)\s*(=|<=?|>=?|<>)\s*[+-]?(\d+\.?\d*)\s*\]\](?:\r?\n|\n)*([\S\s]*?)-{0,2}\[\[version\]\]((?:\r?\n|\n)*)/gi, function sqlVerRpl(match, lb1, key, ver, fsql, lb2) {
      return (key && ver && !isNaN(ver = parseFloat(ver)) && COMPARE[key](dbs.at.version, ver) && fsql && (lb1 + fsql)) || ((lb1 || lb2) && ' ') || '';
    });
    return sql.replace(/((?:\r?\n|\n)*)-{0,2}\[\[\?(?!\[\[\?)\s*(\w+)\s*\]\](?:\r?\n|\n)*([\S\s]*?)-{0,2}\[\[\?\]\]((?:\r?\n|\n)*)/g, function sqlFragRpl(match, lb1, key, fsql, lb2) {
      return (key && keys && keys.indexOf(key) >= 0 && fsql && (lb1 + fsql)) || ((lb1 || lb2) && ' ') || '';
    });
  }

  /**
   * Iterates through and commits the different database connection transactions
   */
  async commit() {
    const dbs = internal(this);
    return dbs.at.dbx.commit(generateDbsOpts(dbs));
  }

  /**
   * Iterates through and rollback the different database connection transactions
   */
  async rollback() {
    const dbs = internal(this);
    return dbs.at.dbx.rollback(generateDbsOpts(dbs));
  }

  /**
   * Iterates through and terminates the different database connection pools
   */
  async close() {
    const dbs = internal(this);
    return dbs.at.dbx.close(generateDbsOpts(dbs));
  }
}

/**
 * Generates options for {@link DBS}
 * @private
 * @param {DBS} dbs The {@link DBS} state instance
 * @param {DialectOptions} [opts] Optional options where additional options will be set
 * @returns {DialectOptions} The {@link Dialect} options
 */
function generateDbsOpts(dbs, opts) {
  const ropts = opts || {};
  ropts.tx = { pending: dbs.at.pending };
  return ropts;
}

/**
 * Generate a {@link Manager} _logger_
 * @private
 * @param {Function} log The `function(...args)` that will log out the arguments
 * @param {Sring[]} [tags] The tags that will prefix the log output
 */
function generateLogger(log, tags) {
  return function dbManagerLogger(o) {
    const logs = typeof o === 'string' ? [format.apply(null, arguments)] : arguments;
    for (let i = 0, l = logs.length; i < l; ++i) {
      log(`[${tags ? tags.join() : ''}] ${logs[i]}`);
    }
  };
}

module.exports = Object.freeze({ Manager, Dialect });

// private mapping
let map = new WeakMap();
let internal = function (object) {
  if (!map.has(object)) {
    map.set(object, {});
  }
  return {
    at: map.get(object),
    this: object
  };
};