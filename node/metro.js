var fs = require('fs'),
	os = require('os'),
	mkdirp = require('mkdirp'),
  ncp = require('ncp').ncp;

/**
 * Framework version.
 */

var version = '0.0.1';

/**
 * Usage documentation.
 */

var usage = ''
  + '\n'
  + '  Usage: node metro [options] [path]\n'
  + '\n'
  + '  Options:\n'
  + '    -i, --iis                iisnode compatibility\n'
  + '    -v, --version            output framework version\n'
  + '    -h, --help               output help information\n'
  ;

// Parse arguments

var args = process.argv.slice(2)
  , path = '.'
  , forIis = false;

while (args.length) {
  var arg = args.shift();
  switch (arg) {
    case '-h':
    case '--help':
      abort(usage);
      break;
    case '-v':
    case '--version':
      abort(version);
      break;
    case '-i':
    case '--iis':
      forIis= true;
      break;
    default:
        path = arg;
  }
}


/**
 * End-of-line code.
 */

var eol = os.platform
  ? ('win32' == os.platform() ? '\r\n' : '\n')
  : '\n';

/**
 * Routes index template.
 */

var index = [
    ''
  , '/*'
  , ' * GET home page.'
  , ' */'
  , ''
  , 'exports.index = function(req, res){'
  , '  res.render(\'index\', { title: \'Metro.css\' })'
  , '};'
].join(eol);

/**
 * Jade layout template.
 */

var jadeLayout = [
    '!!!'
  , 'html'
  , '  head'
  , '    title= title'
  , '    link(rel=\'stylesheet\', href=\'/css/metro.css\')'
  , '    style'
  , '      body { width: 800px; margin: 0 auto; }'
  , '    script(type=\'text/javascript\', src=\'http://code.jquery.com/jquery-1.5.1.min.js\')'
  , '    script(type=\'text/javascript\', src=\'/js/jquery.metro.js\')'
  , '  body.whitebg.blue!= body'
].join(eol);

/**
 * Jade index template.
 */

var jadeIndex = [
    'h1= title'
  , 'div.metro-pivot'
  , '  div.pivot-item'
  , '    h3 page one'
  , '    p page one content'
  , '  div.pivot-item'
  , '    h3 page two'
  , '    p page two content'
  , '  div.pivot-item'
  , '    h3 page three'
  , '    p page three content'
  , '  script'
  , '    var defaults = {'
  , '      animationDuration: 350,'
  , '      headerOpacity: 0.25,'
  , '      fixedHeaders: false,'
  , '      headerSelector: function (item) { return item.children("h3").first(); },'
  , '      itemSelector: function (item) { return item.children(".pivot-item"); },'
  , '      headerItemTemplate: function () { return $("<span class=\'header\' />"); },'
  , '      pivotItemTemplate: function () { return $("<div class=\'pivotItem\' />"); },'
  , '      itemsTemplate: function () { return $("<div class=\'items\' />"); },'
  , '      headersTemplate: function () { return $("<div class=\'headers\' />"); },'
  , '      controlInitialized: undefined,'
  , '      selectedItemChanged: undefined'
  , '    };'
  , '    $(function () {'
  , '      $("div.metro-pivot").metroPivot(defaults);'
  , '    });'
].join(eol);

/**
 * App template.
 */

var app = [
    ''
  , '/**'
  , ' * Module dependencies.'
  , ' */'
  , ''
  , 'var express = require(\'express\')'
  , '  , routes = require(\'./routes\')'
  , '  , less = require(\'less\')'
  , ''
  , 'var app = module.exports = express.createServer();'
  , ''
  , '// Hack connect.js to allow relative @import statements in less.js'
  , 'express.compiler.compilers.less.compile = function(str, fn) {'
  , '    try {'
  , '        less.render(str, {paths: [__dirname + \'/public/css\']}, fn);'
  , '    } catch (err) {'
  , '        fn(err);'
  , '    }'
  , '};'
  , ''
  , '// Configuration'
  , ''
  , 'app.configure(function(){'
  , '  app.set(\'views\', __dirname + \'/views\');'
  , '  app.set(\'view engine\', \'jade\');'
  , '  app.use(express.bodyParser());'
  , '  app.use(express.methodOverride());'
  , '  app.use(app.router);'
  , '  app.use(express.compiler({ src: __dirname + \'/public\', enable: [\'less\']}));'
  , '  app.use(express.static(__dirname + \'/public\'));'
  , '});'
  , ''
  , 'app.configure(\'development\', function(){'
  , '  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); '
  , '});'
  , ''
  , 'app.configure(\'production\', function(){'
  , '  app.use(express.errorHandler()); '
  , '});'
  , ''
  , '// Routes'
  , ''
  , 'app.get(\'/\', routes.index);'
  , ''
  , 'app.listen(' + (forIis ? 'process.env.PORT' : '3000') + ');'
  , 'console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);'
  , ''
].join(eol);

// IISNode web.config
if (forIis) {
	var webConfig = [
        ''
      , '<configuration>'
      , '  <system.webServer>'
      , '    <handlers>'
      , '      <add name="iisnode" path="app.js" verb="*" modules="iisnode" />'
      , '    </handlers>'
      , '    <iisnode loggingEnabled="false" />'
      , '    <rewrite>'
      , '      <rules>'
      , '        <rule name="myapp">'
      , '          <match url="/*" />'
      , '          <action type="Rewrite" url="app.js" />'
      , '        </rule>'
      , '      </rules>'
      , '    </rewrite>'
      , '  </system.webServer>'
      , '</configuration>'
	].join(eol);
}

// Generate application

(function createApplication(path) {
  emptyDirectory(path, function(empty){
    if (empty) {
      createApplicationAt(path);
    } else {
      confirm('destination is not empty, continue? ', function(ok){
        if (ok) {
          process.stdin.destroy();
          createApplicationAt(path);
        } else {
          abort('aborting');
        }
      });
    }
  });
})(path);

/**
 * Create application at the given directory `path`.
 *
 * @param {String} path
 */

function createApplicationAt(path) {
  console.log();
  process.on('exit', function(){
    console.log();
    console.log('   dont forget to install dependencies:');
    console.log('   $ cd %s && npm install', path);
    console.log();
  });

  mkdir(path, function(){
    mkdir(path + '/public');
    mkdir(path + '/public/js', function() {
      copy('../scripts/jquery.metro.js', path + '/public/js/jquery.metro.js');
    });
    mkdir(path + '/public/img');
    mkdir(path + '/public/css', function(){
      ncp('../less', path + '/public/css', function() { });
    });

    mkdir(path + '/routes', function(){
      write(path + '/routes/index.js', index);
    });

    mkdir(path + '/views', function(){
        write(path + '/views/layout.jade', jadeLayout);
        write(path + '/views/index.jade', jadeIndex);
    });

    // package.json
    var json = '{' + eol;
    json += '    "name": "application-name"' + eol;
    json += '  , "version": "0.0.1"' + eol;
    json += '  , "private": true' + eol;
    json += '  , "dependencies": {' + eol;
    json += '      "express": ">= 2.5.0"' + eol;
    json += '      , "jade": ">= 0.20.1"' + eol;
    json += '      , "less": ">= 1.2.0"' + eol;
    json += '  }' + eol;
    json += '}';

    write(path + '/package.json', json);
    write(path + '/app.js', app);
    if (forIis) {
    	write(path + '/web.config', webConfig);
    }
  });
}

/**
 * Check if the given directory `path` is empty.
 *
 * @param {String} path
 * @param {Function} fn
 */

function emptyDirectory(path, fn) {
  fs.readdir(path, function(err, files){
    if (err && 'ENOENT' != err.code) throw err;
    fn(!files || !files.length);
  });
}

/**
 * echo str > path.
 *
 * @param {String} path
 * @param {String} str
 */

function write(path, str) {
  fs.writeFile(path, str);
  console.log('   \x1b[36mcreate\x1b[0m : ' + path);
}

/**
 * Prompt confirmation with the given `msg`.
 *
 * @param {String} msg
 * @param {Function} fn
 */

function confirm(msg, fn) {
  prompt(msg, function(val){
    fn(/^ *y(es)?/i.test(val));
  });
}

/**
 * Prompt input with the given `msg` and callback `fn`.
 *
 * @param {String} msg
 * @param {Function} fn
 */

function prompt(msg, fn) {
  // prompt
  if (' ' == msg[msg.length - 1]) {
    process.stdout.write(msg);
  } else {
    console.log(msg);
  }

  // stdin
  process.stdin.setEncoding('ascii');
  process.stdin.once('data', function(data){
    fn(data);
  }).resume();
}

/**
 * Mkdir -p.
 *
 * @param {String} path
 * @param {Function} fn
 */

function mkdir(path, fn) {
  mkdirp(path, 0755, function(err){
    if (err) throw err;
    console.log('   \033[36mcreate\033[0m : ' + path);
    fn && fn();
  });
}

function copy(from, to, done) {
  var fileFrom = fs.createReadStream(from);
  var fileTo = fs.createWriteStream(to);
  fileTo.on('end', done || function() { });
  fileFrom.pipe(fileTo);
}

/**
 * Exit with the given `str`.
 *
 * @param {String} str
 */

function abort(str) {
  console.error(str);
  process.exit(1);
}