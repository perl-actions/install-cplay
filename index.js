// https://github.com/actions/toolkit

const core = require("@actions/core");
const github = require("@actions/github");
const tc = require("@actions/tool-cache");
const exec = require("@actions/exec");

/*
 * Generic helpers
 */

function is_true(b) {
  if (b !== null && (b === true || b == "true" || b == "1" || b == "ok")) {
    return true;
  }

  return false;
}

function is_false(b) {
  return is_true(b) ? false : true;
}

/*
 * cNext action
 */

var cNext = function cNext() {
  this.workflow = "cnext";

  // this.install   = core.getInput("install");
  // this.cpanfile  = core.getInput("cpanfile");
  // this.tests     = core.getInput("tests");
  // this.args      = core.getInput("args");

  return;
};

cNext.prototype.install_cnext = async function () {
  const cnext = await tc.downloadTool("https://git.io/cnext");
  core.info("cnext", cnext);
  await this.do_exec(["perl", cnext, "self-install"]);
  return;
};

cNext.prototype.get_tarball_value = function () {
  const use_ci = is_true(core.getInput("ci"));

  if (!use_ci) {
    return core.getInput("tarball");
  }

  /* when using ci then build a tarball URL from context */
  const repository = github.context.payload.repository.full_name;
  const sha = github.context.sha;

  return `https://github.com/${repository}/archive/${sha}.tar.gz`;
};

cNext.prototype.do_exec = async function (cmd) {
  const sudo = is_true(core.getInput("sudo"));
  const bin = sudo ? "sudo" : cmd.shift();

  core.info(`do_exec: ${bin}`);

  await exec.exec(bin, cmd);
};

cNext.prototype.run = async function () {
  await this.install_cnext();

  // Get the JSON webhook payload for the event that triggered the workflow
  //const payload = JSON.stringify(github.context.payload, undefined, 2)
  //core.info(`The event payload: ${payload}`);

  // input arguments
  const install = core.getInput("install");
  const cpanfile = core.getInput("cpanfile");
  const tests = core.getInput("tests");
  const args = core.getInput("args");
  const tarball = this.get_tarball_value();

  const w_test = is_true(tests) ? "--test" : "--no-test";
  var w_args = [];

  if (args !== null && args.length) {
    w_args = args.split(/\s+/);
  }

  if (install !== null && install.length) {
    core.info(`install: ${install}!`);
    const list = install.split("\n");
    var cmd = ["cnext", "install", "-d", w_test];
    if (w_args.length) {
      cmd = cmd.concat(w_args);
    }
    cmd = cmd.concat(list);
    await this.do_exec(cmd);
  }

  if (cpanfile !== null && cpanfile.length) {
    core.info(`cpanfile: ${cpanfile}!`);
    var cmd = ["cnext", "cpanfile", "-d", w_test];
    if (w_args.length) {
      cmd = cmd.concat(w_args);
    }
    cmd.push(cpanfile);
    await this.do_exec(cmd);
  }

  if (tarball !== null && tarball.length) {
    core.info(`tarball: ${tarball}!`);
    var cmd = ["cnext", "from-tarball", "-d", w_test];
    if (w_args.length) {
      cmd = cmd.concat(w_args);
    }
    cmd.push(tarball);
    await this.do_exec(cmd);
  }

  return;
};

/* ------------------- */
/* calling the action  */
/* ------------------- */
// https://alphacoder.xyz/nodejs-unhandled-promise-rejection-warning/
(async function() {
    try {
      const action = new cNext();
      await action.run();
    } catch(error) {
        core.setFailed(error.message);
    }
})();
/* ------------------- */
