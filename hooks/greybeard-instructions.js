'use strict';
// greybeard — builds the context injected at session start.
//
// The ruleset has one source of truth: skills/greybeard/SKILL.md. This module
// strips its frontmatter and prefixes the active level, then appends the
// project's GREYBEARD.md if there is one.

const fs = require('fs');
const path = require('path');
const { findMemoryFile, readMemoryFile, stripBom } = require('./greybeard-runtime');

// Keep the injected memory bounded; a huge file goes in by reference instead.
const MEMORY_LIMIT = 12000;

function stripFrontmatter(text) {
  return stripBom(text).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
}

function loadRules(mode) {
  const file = path.join(__dirname, '..', 'skills', 'greybeard', 'SKILL.md');
  const text = stripFrontmatter(fs.readFileSync(file, 'utf8'));
  return 'GREYBEARD MODE ACTIVE — level: ' + mode + '\n\n' + text.trim();
}

function loadMemory(cwd) {
  const file = findMemoryFile([cwd, process.cwd()]);
  if (!file) {
    return (
      'PROJECT MEMORY: no GREYBEARD.md found in this project. When you learn why ' +
      'something is the way it is, record it with /greybeard-remember.'
    );
  }
  let content = readMemoryFile(file).trim();
  if (content.length > MEMORY_LIMIT) {
    content =
      content.slice(0, MEMORY_LIMIT) +
      '\n\n[truncated — read ' + file + ' for the rest before changing anything it covers]';
  }
  return 'PROJECT MEMORY (' + file + '). Read before you change anything it covers:\n\n' + content;
}

function getInstructions(mode, cwd) {
  return loadRules(mode) + '\n\n' + loadMemory(cwd);
}

module.exports = { getInstructions, loadRules, loadMemory, stripFrontmatter };
