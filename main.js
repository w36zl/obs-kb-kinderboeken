"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/fast-xml-parser/src/util.js
var require_util = __commonJS({
  "node_modules/fast-xml-parser/src/util.js"(exports) {
    "use strict";
    var nameStartChar = ":A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
    var nameChar = nameStartChar + "\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040";
    var nameRegexp = "[" + nameStartChar + "][" + nameChar + "]*";
    var regexName = new RegExp("^" + nameRegexp + "$");
    var getAllMatches = function(string, regex) {
      const matches = [];
      let match = regex.exec(string);
      while (match) {
        const allmatches = [];
        allmatches.startIndex = regex.lastIndex - match[0].length;
        const len = match.length;
        for (let index = 0; index < len; index++) {
          allmatches.push(match[index]);
        }
        matches.push(allmatches);
        match = regex.exec(string);
      }
      return matches;
    };
    var isName = function(string) {
      const match = regexName.exec(string);
      return !(match === null || typeof match === "undefined");
    };
    exports.isExist = function(v) {
      return typeof v !== "undefined";
    };
    exports.isEmptyObject = function(obj) {
      return Object.keys(obj).length === 0;
    };
    exports.merge = function(target, a, arrayMode) {
      if (a) {
        const keys = Object.keys(a);
        const len = keys.length;
        for (let i = 0; i < len; i++) {
          if (arrayMode === "strict") {
            target[keys[i]] = [a[keys[i]]];
          } else {
            target[keys[i]] = a[keys[i]];
          }
        }
      }
    };
    exports.getValue = function(v) {
      if (exports.isExist(v)) {
        return v;
      } else {
        return "";
      }
    };
    exports.isName = isName;
    exports.getAllMatches = getAllMatches;
    exports.nameRegexp = nameRegexp;
  }
});

// node_modules/fast-xml-parser/src/validator.js
var require_validator = __commonJS({
  "node_modules/fast-xml-parser/src/validator.js"(exports) {
    "use strict";
    var util = require_util();
    var defaultOptions = {
      allowBooleanAttributes: false,
      //A tag can have attributes without any value
      unpairedTags: []
    };
    exports.validate = function(xmlData, options) {
      options = Object.assign({}, defaultOptions, options);
      const tags = [];
      let tagFound = false;
      let reachedRoot = false;
      if (xmlData[0] === "\uFEFF") {
        xmlData = xmlData.substr(1);
      }
      for (let i = 0; i < xmlData.length; i++) {
        if (xmlData[i] === "<" && xmlData[i + 1] === "?") {
          i += 2;
          i = readPI(xmlData, i);
          if (i.err) return i;
        } else if (xmlData[i] === "<") {
          let tagStartPos = i;
          i++;
          if (xmlData[i] === "!") {
            i = readCommentAndCDATA(xmlData, i);
            continue;
          } else {
            let closingTag = false;
            if (xmlData[i] === "/") {
              closingTag = true;
              i++;
            }
            let tagName = "";
            for (; i < xmlData.length && xmlData[i] !== ">" && xmlData[i] !== " " && xmlData[i] !== "	" && xmlData[i] !== "\n" && xmlData[i] !== "\r"; i++) {
              tagName += xmlData[i];
            }
            tagName = tagName.trim();
            if (tagName[tagName.length - 1] === "/") {
              tagName = tagName.substring(0, tagName.length - 1);
              i--;
            }
            if (!validateTagName(tagName)) {
              let msg;
              if (tagName.trim().length === 0) {
                msg = "Invalid space after '<'.";
              } else {
                msg = "Tag '" + tagName + "' is an invalid name.";
              }
              return getErrorObject("InvalidTag", msg, getLineNumberForPosition(xmlData, i));
            }
            const result = readAttributeStr(xmlData, i);
            if (result === false) {
              return getErrorObject("InvalidAttr", "Attributes for '" + tagName + "' have open quote.", getLineNumberForPosition(xmlData, i));
            }
            let attrStr = result.value;
            i = result.index;
            if (attrStr[attrStr.length - 1] === "/") {
              const attrStrStart = i - attrStr.length;
              attrStr = attrStr.substring(0, attrStr.length - 1);
              const isValid = validateAttributeString(attrStr, options);
              if (isValid === true) {
                tagFound = true;
              } else {
                return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, attrStrStart + isValid.err.line));
              }
            } else if (closingTag) {
              if (!result.tagClosed) {
                return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' doesn't have proper closing.", getLineNumberForPosition(xmlData, i));
              } else if (attrStr.trim().length > 0) {
                return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' can't have attributes or invalid starting.", getLineNumberForPosition(xmlData, tagStartPos));
              } else if (tags.length === 0) {
                return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' has not been opened.", getLineNumberForPosition(xmlData, tagStartPos));
              } else {
                const otg = tags.pop();
                if (tagName !== otg.tagName) {
                  let openPos = getLineNumberForPosition(xmlData, otg.tagStartPos);
                  return getErrorObject(
                    "InvalidTag",
                    "Expected closing tag '" + otg.tagName + "' (opened in line " + openPos.line + ", col " + openPos.col + ") instead of closing tag '" + tagName + "'.",
                    getLineNumberForPosition(xmlData, tagStartPos)
                  );
                }
                if (tags.length == 0) {
                  reachedRoot = true;
                }
              }
            } else {
              const isValid = validateAttributeString(attrStr, options);
              if (isValid !== true) {
                return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, i - attrStr.length + isValid.err.line));
              }
              if (reachedRoot === true) {
                return getErrorObject("InvalidXml", "Multiple possible root nodes found.", getLineNumberForPosition(xmlData, i));
              } else if (options.unpairedTags.indexOf(tagName) !== -1) {
              } else {
                tags.push({ tagName, tagStartPos });
              }
              tagFound = true;
            }
            for (i++; i < xmlData.length; i++) {
              if (xmlData[i] === "<") {
                if (xmlData[i + 1] === "!") {
                  i++;
                  i = readCommentAndCDATA(xmlData, i);
                  continue;
                } else if (xmlData[i + 1] === "?") {
                  i = readPI(xmlData, ++i);
                  if (i.err) return i;
                } else {
                  break;
                }
              } else if (xmlData[i] === "&") {
                const afterAmp = validateAmpersand(xmlData, i);
                if (afterAmp == -1)
                  return getErrorObject("InvalidChar", "char '&' is not expected.", getLineNumberForPosition(xmlData, i));
                i = afterAmp;
              } else {
                if (reachedRoot === true && !isWhiteSpace(xmlData[i])) {
                  return getErrorObject("InvalidXml", "Extra text at the end", getLineNumberForPosition(xmlData, i));
                }
              }
            }
            if (xmlData[i] === "<") {
              i--;
            }
          }
        } else {
          if (isWhiteSpace(xmlData[i])) {
            continue;
          }
          return getErrorObject("InvalidChar", "char '" + xmlData[i] + "' is not expected.", getLineNumberForPosition(xmlData, i));
        }
      }
      if (!tagFound) {
        return getErrorObject("InvalidXml", "Start tag expected.", 1);
      } else if (tags.length == 1) {
        return getErrorObject("InvalidTag", "Unclosed tag '" + tags[0].tagName + "'.", getLineNumberForPosition(xmlData, tags[0].tagStartPos));
      } else if (tags.length > 0) {
        return getErrorObject("InvalidXml", "Invalid '" + JSON.stringify(tags.map((t) => t.tagName), null, 4).replace(/\r?\n/g, "") + "' found.", { line: 1, col: 1 });
      }
      return true;
    };
    function isWhiteSpace(char) {
      return char === " " || char === "	" || char === "\n" || char === "\r";
    }
    function readPI(xmlData, i) {
      const start = i;
      for (; i < xmlData.length; i++) {
        if (xmlData[i] == "?" || xmlData[i] == " ") {
          const tagname = xmlData.substr(start, i - start);
          if (i > 5 && tagname === "xml") {
            return getErrorObject("InvalidXml", "XML declaration allowed only at the start of the document.", getLineNumberForPosition(xmlData, i));
          } else if (xmlData[i] == "?" && xmlData[i + 1] == ">") {
            i++;
            break;
          } else {
            continue;
          }
        }
      }
      return i;
    }
    function readCommentAndCDATA(xmlData, i) {
      if (xmlData.length > i + 5 && xmlData[i + 1] === "-" && xmlData[i + 2] === "-") {
        for (i += 3; i < xmlData.length; i++) {
          if (xmlData[i] === "-" && xmlData[i + 1] === "-" && xmlData[i + 2] === ">") {
            i += 2;
            break;
          }
        }
      } else if (xmlData.length > i + 8 && xmlData[i + 1] === "D" && xmlData[i + 2] === "O" && xmlData[i + 3] === "C" && xmlData[i + 4] === "T" && xmlData[i + 5] === "Y" && xmlData[i + 6] === "P" && xmlData[i + 7] === "E") {
        let angleBracketsCount = 1;
        for (i += 8; i < xmlData.length; i++) {
          if (xmlData[i] === "<") {
            angleBracketsCount++;
          } else if (xmlData[i] === ">") {
            angleBracketsCount--;
            if (angleBracketsCount === 0) {
              break;
            }
          }
        }
      } else if (xmlData.length > i + 9 && xmlData[i + 1] === "[" && xmlData[i + 2] === "C" && xmlData[i + 3] === "D" && xmlData[i + 4] === "A" && xmlData[i + 5] === "T" && xmlData[i + 6] === "A" && xmlData[i + 7] === "[") {
        for (i += 8; i < xmlData.length; i++) {
          if (xmlData[i] === "]" && xmlData[i + 1] === "]" && xmlData[i + 2] === ">") {
            i += 2;
            break;
          }
        }
      }
      return i;
    }
    var doubleQuote = '"';
    var singleQuote = "'";
    function readAttributeStr(xmlData, i) {
      let attrStr = "";
      let startChar = "";
      let tagClosed = false;
      for (; i < xmlData.length; i++) {
        if (xmlData[i] === doubleQuote || xmlData[i] === singleQuote) {
          if (startChar === "") {
            startChar = xmlData[i];
          } else if (startChar !== xmlData[i]) {
          } else {
            startChar = "";
          }
        } else if (xmlData[i] === ">") {
          if (startChar === "") {
            tagClosed = true;
            break;
          }
        }
        attrStr += xmlData[i];
      }
      if (startChar !== "") {
        return false;
      }
      return {
        value: attrStr,
        index: i,
        tagClosed
      };
    }
    var validAttrStrRegxp = new RegExp(`(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['"])(([\\s\\S])*?)\\5)?`, "g");
    function validateAttributeString(attrStr, options) {
      const matches = util.getAllMatches(attrStr, validAttrStrRegxp);
      const attrNames = {};
      for (let i = 0; i < matches.length; i++) {
        if (matches[i][1].length === 0) {
          return getErrorObject("InvalidAttr", "Attribute '" + matches[i][2] + "' has no space in starting.", getPositionFromMatch(matches[i]));
        } else if (matches[i][3] !== void 0 && matches[i][4] === void 0) {
          return getErrorObject("InvalidAttr", "Attribute '" + matches[i][2] + "' is without value.", getPositionFromMatch(matches[i]));
        } else if (matches[i][3] === void 0 && !options.allowBooleanAttributes) {
          return getErrorObject("InvalidAttr", "boolean attribute '" + matches[i][2] + "' is not allowed.", getPositionFromMatch(matches[i]));
        }
        const attrName = matches[i][2];
        if (!validateAttrName(attrName)) {
          return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is an invalid name.", getPositionFromMatch(matches[i]));
        }
        if (!attrNames.hasOwnProperty(attrName)) {
          attrNames[attrName] = 1;
        } else {
          return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is repeated.", getPositionFromMatch(matches[i]));
        }
      }
      return true;
    }
    function validateNumberAmpersand(xmlData, i) {
      let re = /\d/;
      if (xmlData[i] === "x") {
        i++;
        re = /[\da-fA-F]/;
      }
      for (; i < xmlData.length; i++) {
        if (xmlData[i] === ";")
          return i;
        if (!xmlData[i].match(re))
          break;
      }
      return -1;
    }
    function validateAmpersand(xmlData, i) {
      i++;
      if (xmlData[i] === ";")
        return -1;
      if (xmlData[i] === "#") {
        i++;
        return validateNumberAmpersand(xmlData, i);
      }
      let count = 0;
      for (; i < xmlData.length; i++, count++) {
        if (xmlData[i].match(/\w/) && count < 20)
          continue;
        if (xmlData[i] === ";")
          break;
        return -1;
      }
      return i;
    }
    function getErrorObject(code, message, lineNumber) {
      return {
        err: {
          code,
          msg: message,
          line: lineNumber.line || lineNumber,
          col: lineNumber.col
        }
      };
    }
    function validateAttrName(attrName) {
      return util.isName(attrName);
    }
    function validateTagName(tagname) {
      return util.isName(tagname);
    }
    function getLineNumberForPosition(xmlData, index) {
      const lines = xmlData.substring(0, index).split(/\r?\n/);
      return {
        line: lines.length,
        // column number is last line's length + 1, because column numbering starts at 1:
        col: lines[lines.length - 1].length + 1
      };
    }
    function getPositionFromMatch(match) {
      return match.startIndex + match[1].length;
    }
  }
});

// node_modules/fast-xml-parser/src/xmlparser/OptionsBuilder.js
var require_OptionsBuilder = __commonJS({
  "node_modules/fast-xml-parser/src/xmlparser/OptionsBuilder.js"(exports) {
    "use strict";
    var defaultOptions = {
      preserveOrder: false,
      attributeNamePrefix: "@_",
      attributesGroupName: false,
      textNodeName: "#text",
      ignoreAttributes: true,
      removeNSPrefix: false,
      // remove NS from tag name or attribute name if true
      allowBooleanAttributes: false,
      //a tag can have attributes without any value
      //ignoreRootElement : false,
      parseTagValue: true,
      parseAttributeValue: false,
      trimValues: true,
      //Trim string values of tag and attributes
      cdataPropName: false,
      numberParseOptions: {
        hex: true,
        leadingZeros: true,
        eNotation: true
      },
      tagValueProcessor: function(tagName, val) {
        return val;
      },
      attributeValueProcessor: function(attrName, val) {
        return val;
      },
      stopNodes: [],
      //nested tags will not be parsed even for errors
      alwaysCreateTextNode: false,
      isArray: () => false,
      commentPropName: false,
      unpairedTags: [],
      processEntities: true,
      htmlEntities: false,
      ignoreDeclaration: false,
      ignorePiTags: false,
      transformTagName: false,
      transformAttributeName: false,
      updateTag: function(tagName, jPath, attrs) {
        return tagName;
      }
      // skipEmptyListItem: false
    };
    var buildOptions = function(options) {
      return Object.assign({}, defaultOptions, options);
    };
    exports.buildOptions = buildOptions;
    exports.defaultOptions = defaultOptions;
  }
});

// node_modules/fast-xml-parser/src/xmlparser/xmlNode.js
var require_xmlNode = __commonJS({
  "node_modules/fast-xml-parser/src/xmlparser/xmlNode.js"(exports, module2) {
    "use strict";
    var XmlNode = class {
      constructor(tagname) {
        this.tagname = tagname;
        this.child = [];
        this[":@"] = {};
      }
      add(key, val) {
        if (key === "__proto__") key = "#__proto__";
        this.child.push({ [key]: val });
      }
      addChild(node) {
        if (node.tagname === "__proto__") node.tagname = "#__proto__";
        if (node[":@"] && Object.keys(node[":@"]).length > 0) {
          this.child.push({ [node.tagname]: node.child, [":@"]: node[":@"] });
        } else {
          this.child.push({ [node.tagname]: node.child });
        }
      }
    };
    module2.exports = XmlNode;
  }
});

// node_modules/fast-xml-parser/src/xmlparser/DocTypeReader.js
var require_DocTypeReader = __commonJS({
  "node_modules/fast-xml-parser/src/xmlparser/DocTypeReader.js"(exports, module2) {
    "use strict";
    var util = require_util();
    function readDocType(xmlData, i) {
      const entities = {};
      if (xmlData[i + 3] === "O" && xmlData[i + 4] === "C" && xmlData[i + 5] === "T" && xmlData[i + 6] === "Y" && xmlData[i + 7] === "P" && xmlData[i + 8] === "E") {
        i = i + 9;
        let angleBracketsCount = 1;
        let hasBody = false, comment = false;
        let exp = "";
        for (; i < xmlData.length; i++) {
          if (xmlData[i] === "<" && !comment) {
            if (hasBody && isEntity(xmlData, i)) {
              i += 7;
              let entityName, val;
              [entityName, val, i] = readEntityExp(xmlData, i + 1);
              if (val.indexOf("&") === -1)
                entities[validateEntityName(entityName)] = {
                  regx: RegExp(`&${entityName};`, "g"),
                  val
                };
            } else if (hasBody && isElement(xmlData, i)) i += 8;
            else if (hasBody && isAttlist(xmlData, i)) i += 8;
            else if (hasBody && isNotation(xmlData, i)) i += 9;
            else if (isComment) comment = true;
            else throw new Error("Invalid DOCTYPE");
            angleBracketsCount++;
            exp = "";
          } else if (xmlData[i] === ">") {
            if (comment) {
              if (xmlData[i - 1] === "-" && xmlData[i - 2] === "-") {
                comment = false;
                angleBracketsCount--;
              }
            } else {
              angleBracketsCount--;
            }
            if (angleBracketsCount === 0) {
              break;
            }
          } else if (xmlData[i] === "[") {
            hasBody = true;
          } else {
            exp += xmlData[i];
          }
        }
        if (angleBracketsCount !== 0) {
          throw new Error(`Unclosed DOCTYPE`);
        }
      } else {
        throw new Error(`Invalid Tag instead of DOCTYPE`);
      }
      return { entities, i };
    }
    function readEntityExp(xmlData, i) {
      let entityName = "";
      for (; i < xmlData.length && (xmlData[i] !== "'" && xmlData[i] !== '"'); i++) {
        entityName += xmlData[i];
      }
      entityName = entityName.trim();
      if (entityName.indexOf(" ") !== -1) throw new Error("External entites are not supported");
      const startChar = xmlData[i++];
      let val = "";
      for (; i < xmlData.length && xmlData[i] !== startChar; i++) {
        val += xmlData[i];
      }
      return [entityName, val, i];
    }
    function isComment(xmlData, i) {
      if (xmlData[i + 1] === "!" && xmlData[i + 2] === "-" && xmlData[i + 3] === "-") return true;
      return false;
    }
    function isEntity(xmlData, i) {
      if (xmlData[i + 1] === "!" && xmlData[i + 2] === "E" && xmlData[i + 3] === "N" && xmlData[i + 4] === "T" && xmlData[i + 5] === "I" && xmlData[i + 6] === "T" && xmlData[i + 7] === "Y") return true;
      return false;
    }
    function isElement(xmlData, i) {
      if (xmlData[i + 1] === "!" && xmlData[i + 2] === "E" && xmlData[i + 3] === "L" && xmlData[i + 4] === "E" && xmlData[i + 5] === "M" && xmlData[i + 6] === "E" && xmlData[i + 7] === "N" && xmlData[i + 8] === "T") return true;
      return false;
    }
    function isAttlist(xmlData, i) {
      if (xmlData[i + 1] === "!" && xmlData[i + 2] === "A" && xmlData[i + 3] === "T" && xmlData[i + 4] === "T" && xmlData[i + 5] === "L" && xmlData[i + 6] === "I" && xmlData[i + 7] === "S" && xmlData[i + 8] === "T") return true;
      return false;
    }
    function isNotation(xmlData, i) {
      if (xmlData[i + 1] === "!" && xmlData[i + 2] === "N" && xmlData[i + 3] === "O" && xmlData[i + 4] === "T" && xmlData[i + 5] === "A" && xmlData[i + 6] === "T" && xmlData[i + 7] === "I" && xmlData[i + 8] === "O" && xmlData[i + 9] === "N") return true;
      return false;
    }
    function validateEntityName(name) {
      if (util.isName(name))
        return name;
      else
        throw new Error(`Invalid entity name ${name}`);
    }
    module2.exports = readDocType;
  }
});

// node_modules/strnum/strnum.js
var require_strnum = __commonJS({
  "node_modules/strnum/strnum.js"(exports, module2) {
    "use strict";
    var hexRegex = /^[-+]?0x[a-fA-F0-9]+$/;
    var numRegex = /^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/;
    var consider = {
      hex: true,
      // oct: false,
      leadingZeros: true,
      decimalPoint: ".",
      eNotation: true
      //skipLike: /regex/
    };
    function toNumber(str, options = {}) {
      options = Object.assign({}, consider, options);
      if (!str || typeof str !== "string") return str;
      let trimmedStr = str.trim();
      if (options.skipLike !== void 0 && options.skipLike.test(trimmedStr)) return str;
      else if (str === "0") return 0;
      else if (options.hex && hexRegex.test(trimmedStr)) {
        return parse_int(trimmedStr, 16);
      } else if (trimmedStr.search(/[eE]/) !== -1) {
        const notation = trimmedStr.match(/^([-\+])?(0*)([0-9]*(\.[0-9]*)?[eE][-\+]?[0-9]+)$/);
        if (notation) {
          if (options.leadingZeros) {
            trimmedStr = (notation[1] || "") + notation[3];
          } else {
            if (notation[2] === "0" && notation[3][0] === ".") {
            } else {
              return str;
            }
          }
          return options.eNotation ? Number(trimmedStr) : str;
        } else {
          return str;
        }
      } else {
        const match = numRegex.exec(trimmedStr);
        if (match) {
          const sign = match[1];
          const leadingZeros = match[2];
          let numTrimmedByZeros = trimZeros(match[3]);
          if (!options.leadingZeros && leadingZeros.length > 0 && sign && trimmedStr[2] !== ".") return str;
          else if (!options.leadingZeros && leadingZeros.length > 0 && !sign && trimmedStr[1] !== ".") return str;
          else if (options.leadingZeros && leadingZeros === str) return 0;
          else {
            const num = Number(trimmedStr);
            const numStr = "" + num;
            if (numStr.search(/[eE]/) !== -1) {
              if (options.eNotation) return num;
              else return str;
            } else if (trimmedStr.indexOf(".") !== -1) {
              if (numStr === "0" && numTrimmedByZeros === "") return num;
              else if (numStr === numTrimmedByZeros) return num;
              else if (sign && numStr === "-" + numTrimmedByZeros) return num;
              else return str;
            }
            if (leadingZeros) {
              return numTrimmedByZeros === numStr || sign + numTrimmedByZeros === numStr ? num : str;
            } else {
              return trimmedStr === numStr || trimmedStr === sign + numStr ? num : str;
            }
          }
        } else {
          return str;
        }
      }
    }
    function trimZeros(numStr) {
      if (numStr && numStr.indexOf(".") !== -1) {
        numStr = numStr.replace(/0+$/, "");
        if (numStr === ".") numStr = "0";
        else if (numStr[0] === ".") numStr = "0" + numStr;
        else if (numStr[numStr.length - 1] === ".") numStr = numStr.substr(0, numStr.length - 1);
        return numStr;
      }
      return numStr;
    }
    function parse_int(numStr, base) {
      if (parseInt) return parseInt(numStr, base);
      else if (Number.parseInt) return Number.parseInt(numStr, base);
      else if (window && window.parseInt) return window.parseInt(numStr, base);
      else throw new Error("parseInt, Number.parseInt, window.parseInt are not supported");
    }
    module2.exports = toNumber;
  }
});

// node_modules/fast-xml-parser/src/ignoreAttributes.js
var require_ignoreAttributes = __commonJS({
  "node_modules/fast-xml-parser/src/ignoreAttributes.js"(exports, module2) {
    "use strict";
    function getIgnoreAttributesFn(ignoreAttributes) {
      if (typeof ignoreAttributes === "function") {
        return ignoreAttributes;
      }
      if (Array.isArray(ignoreAttributes)) {
        return (attrName) => {
          for (const pattern of ignoreAttributes) {
            if (typeof pattern === "string" && attrName === pattern) {
              return true;
            }
            if (pattern instanceof RegExp && pattern.test(attrName)) {
              return true;
            }
          }
        };
      }
      return () => false;
    }
    module2.exports = getIgnoreAttributesFn;
  }
});

// node_modules/fast-xml-parser/src/xmlparser/OrderedObjParser.js
var require_OrderedObjParser = __commonJS({
  "node_modules/fast-xml-parser/src/xmlparser/OrderedObjParser.js"(exports, module2) {
    "use strict";
    var util = require_util();
    var xmlNode = require_xmlNode();
    var readDocType = require_DocTypeReader();
    var toNumber = require_strnum();
    var getIgnoreAttributesFn = require_ignoreAttributes();
    var OrderedObjParser = class {
      constructor(options) {
        this.options = options;
        this.currentNode = null;
        this.tagsNodeStack = [];
        this.docTypeEntities = {};
        this.lastEntities = {
          "apos": { regex: /&(apos|#39|#x27);/g, val: "'" },
          "gt": { regex: /&(gt|#62|#x3E);/g, val: ">" },
          "lt": { regex: /&(lt|#60|#x3C);/g, val: "<" },
          "quot": { regex: /&(quot|#34|#x22);/g, val: '"' }
        };
        this.ampEntity = { regex: /&(amp|#38|#x26);/g, val: "&" };
        this.htmlEntities = {
          "space": { regex: /&(nbsp|#160);/g, val: " " },
          // "lt" : { regex: /&(lt|#60);/g, val: "<" },
          // "gt" : { regex: /&(gt|#62);/g, val: ">" },
          // "amp" : { regex: /&(amp|#38);/g, val: "&" },
          // "quot" : { regex: /&(quot|#34);/g, val: "\"" },
          // "apos" : { regex: /&(apos|#39);/g, val: "'" },
          "cent": { regex: /&(cent|#162);/g, val: "\xA2" },
          "pound": { regex: /&(pound|#163);/g, val: "\xA3" },
          "yen": { regex: /&(yen|#165);/g, val: "\xA5" },
          "euro": { regex: /&(euro|#8364);/g, val: "\u20AC" },
          "copyright": { regex: /&(copy|#169);/g, val: "\xA9" },
          "reg": { regex: /&(reg|#174);/g, val: "\xAE" },
          "inr": { regex: /&(inr|#8377);/g, val: "\u20B9" },
          "num_dec": { regex: /&#([0-9]{1,7});/g, val: (_, str) => String.fromCharCode(Number.parseInt(str, 10)) },
          "num_hex": { regex: /&#x([0-9a-fA-F]{1,6});/g, val: (_, str) => String.fromCharCode(Number.parseInt(str, 16)) }
        };
        this.addExternalEntities = addExternalEntities;
        this.parseXml = parseXml;
        this.parseTextData = parseTextData;
        this.resolveNameSpace = resolveNameSpace;
        this.buildAttributesMap = buildAttributesMap;
        this.isItStopNode = isItStopNode;
        this.replaceEntitiesValue = replaceEntitiesValue;
        this.readStopNodeData = readStopNodeData;
        this.saveTextToParentTag = saveTextToParentTag;
        this.addChild = addChild;
        this.ignoreAttributesFn = getIgnoreAttributesFn(this.options.ignoreAttributes);
      }
    };
    function addExternalEntities(externalEntities) {
      const entKeys = Object.keys(externalEntities);
      for (let i = 0; i < entKeys.length; i++) {
        const ent = entKeys[i];
        this.lastEntities[ent] = {
          regex: new RegExp("&" + ent + ";", "g"),
          val: externalEntities[ent]
        };
      }
    }
    function parseTextData(val, tagName, jPath, dontTrim, hasAttributes, isLeafNode, escapeEntities) {
      if (val !== void 0) {
        if (this.options.trimValues && !dontTrim) {
          val = val.trim();
        }
        if (val.length > 0) {
          if (!escapeEntities) val = this.replaceEntitiesValue(val);
          const newval = this.options.tagValueProcessor(tagName, val, jPath, hasAttributes, isLeafNode);
          if (newval === null || newval === void 0) {
            return val;
          } else if (typeof newval !== typeof val || newval !== val) {
            return newval;
          } else if (this.options.trimValues) {
            return parseValue(val, this.options.parseTagValue, this.options.numberParseOptions);
          } else {
            const trimmedVal = val.trim();
            if (trimmedVal === val) {
              return parseValue(val, this.options.parseTagValue, this.options.numberParseOptions);
            } else {
              return val;
            }
          }
        }
      }
    }
    function resolveNameSpace(tagname) {
      if (this.options.removeNSPrefix) {
        const tags = tagname.split(":");
        const prefix = tagname.charAt(0) === "/" ? "/" : "";
        if (tags[0] === "xmlns") {
          return "";
        }
        if (tags.length === 2) {
          tagname = prefix + tags[1];
        }
      }
      return tagname;
    }
    var attrsRegx = new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`, "gm");
    function buildAttributesMap(attrStr, jPath, tagName) {
      if (this.options.ignoreAttributes !== true && typeof attrStr === "string") {
        const matches = util.getAllMatches(attrStr, attrsRegx);
        const len = matches.length;
        const attrs = {};
        for (let i = 0; i < len; i++) {
          const attrName = this.resolveNameSpace(matches[i][1]);
          if (this.ignoreAttributesFn(attrName, jPath)) {
            continue;
          }
          let oldVal = matches[i][4];
          let aName = this.options.attributeNamePrefix + attrName;
          if (attrName.length) {
            if (this.options.transformAttributeName) {
              aName = this.options.transformAttributeName(aName);
            }
            if (aName === "__proto__") aName = "#__proto__";
            if (oldVal !== void 0) {
              if (this.options.trimValues) {
                oldVal = oldVal.trim();
              }
              oldVal = this.replaceEntitiesValue(oldVal);
              const newVal = this.options.attributeValueProcessor(attrName, oldVal, jPath);
              if (newVal === null || newVal === void 0) {
                attrs[aName] = oldVal;
              } else if (typeof newVal !== typeof oldVal || newVal !== oldVal) {
                attrs[aName] = newVal;
              } else {
                attrs[aName] = parseValue(
                  oldVal,
                  this.options.parseAttributeValue,
                  this.options.numberParseOptions
                );
              }
            } else if (this.options.allowBooleanAttributes) {
              attrs[aName] = true;
            }
          }
        }
        if (!Object.keys(attrs).length) {
          return;
        }
        if (this.options.attributesGroupName) {
          const attrCollection = {};
          attrCollection[this.options.attributesGroupName] = attrs;
          return attrCollection;
        }
        return attrs;
      }
    }
    var parseXml = function(xmlData) {
      xmlData = xmlData.replace(/\r\n?/g, "\n");
      const xmlObj = new xmlNode("!xml");
      let currentNode = xmlObj;
      let textData = "";
      let jPath = "";
      for (let i = 0; i < xmlData.length; i++) {
        const ch = xmlData[i];
        if (ch === "<") {
          if (xmlData[i + 1] === "/") {
            const closeIndex = findClosingIndex(xmlData, ">", i, "Closing Tag is not closed.");
            let tagName = xmlData.substring(i + 2, closeIndex).trim();
            if (this.options.removeNSPrefix) {
              const colonIndex = tagName.indexOf(":");
              if (colonIndex !== -1) {
                tagName = tagName.substr(colonIndex + 1);
              }
            }
            if (this.options.transformTagName) {
              tagName = this.options.transformTagName(tagName);
            }
            if (currentNode) {
              textData = this.saveTextToParentTag(textData, currentNode, jPath);
            }
            const lastTagName = jPath.substring(jPath.lastIndexOf(".") + 1);
            if (tagName && this.options.unpairedTags.indexOf(tagName) !== -1) {
              throw new Error(`Unpaired tag can not be used as closing tag: </${tagName}>`);
            }
            let propIndex = 0;
            if (lastTagName && this.options.unpairedTags.indexOf(lastTagName) !== -1) {
              propIndex = jPath.lastIndexOf(".", jPath.lastIndexOf(".") - 1);
              this.tagsNodeStack.pop();
            } else {
              propIndex = jPath.lastIndexOf(".");
            }
            jPath = jPath.substring(0, propIndex);
            currentNode = this.tagsNodeStack.pop();
            textData = "";
            i = closeIndex;
          } else if (xmlData[i + 1] === "?") {
            let tagData = readTagExp(xmlData, i, false, "?>");
            if (!tagData) throw new Error("Pi Tag is not closed.");
            textData = this.saveTextToParentTag(textData, currentNode, jPath);
            if (this.options.ignoreDeclaration && tagData.tagName === "?xml" || this.options.ignorePiTags) {
            } else {
              const childNode = new xmlNode(tagData.tagName);
              childNode.add(this.options.textNodeName, "");
              if (tagData.tagName !== tagData.tagExp && tagData.attrExpPresent) {
                childNode[":@"] = this.buildAttributesMap(tagData.tagExp, jPath, tagData.tagName);
              }
              this.addChild(currentNode, childNode, jPath);
            }
            i = tagData.closeIndex + 1;
          } else if (xmlData.substr(i + 1, 3) === "!--") {
            const endIndex = findClosingIndex(xmlData, "-->", i + 4, "Comment is not closed.");
            if (this.options.commentPropName) {
              const comment = xmlData.substring(i + 4, endIndex - 2);
              textData = this.saveTextToParentTag(textData, currentNode, jPath);
              currentNode.add(this.options.commentPropName, [{ [this.options.textNodeName]: comment }]);
            }
            i = endIndex;
          } else if (xmlData.substr(i + 1, 2) === "!D") {
            const result = readDocType(xmlData, i);
            this.docTypeEntities = result.entities;
            i = result.i;
          } else if (xmlData.substr(i + 1, 2) === "![") {
            const closeIndex = findClosingIndex(xmlData, "]]>", i, "CDATA is not closed.") - 2;
            const tagExp = xmlData.substring(i + 9, closeIndex);
            textData = this.saveTextToParentTag(textData, currentNode, jPath);
            let val = this.parseTextData(tagExp, currentNode.tagname, jPath, true, false, true, true);
            if (val == void 0) val = "";
            if (this.options.cdataPropName) {
              currentNode.add(this.options.cdataPropName, [{ [this.options.textNodeName]: tagExp }]);
            } else {
              currentNode.add(this.options.textNodeName, val);
            }
            i = closeIndex + 2;
          } else {
            let result = readTagExp(xmlData, i, this.options.removeNSPrefix);
            let tagName = result.tagName;
            const rawTagName = result.rawTagName;
            let tagExp = result.tagExp;
            let attrExpPresent = result.attrExpPresent;
            let closeIndex = result.closeIndex;
            if (this.options.transformTagName) {
              tagName = this.options.transformTagName(tagName);
            }
            if (currentNode && textData) {
              if (currentNode.tagname !== "!xml") {
                textData = this.saveTextToParentTag(textData, currentNode, jPath, false);
              }
            }
            const lastTag = currentNode;
            if (lastTag && this.options.unpairedTags.indexOf(lastTag.tagname) !== -1) {
              currentNode = this.tagsNodeStack.pop();
              jPath = jPath.substring(0, jPath.lastIndexOf("."));
            }
            if (tagName !== xmlObj.tagname) {
              jPath += jPath ? "." + tagName : tagName;
            }
            if (this.isItStopNode(this.options.stopNodes, jPath, tagName)) {
              let tagContent = "";
              if (tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1) {
                if (tagName[tagName.length - 1] === "/") {
                  tagName = tagName.substr(0, tagName.length - 1);
                  jPath = jPath.substr(0, jPath.length - 1);
                  tagExp = tagName;
                } else {
                  tagExp = tagExp.substr(0, tagExp.length - 1);
                }
                i = result.closeIndex;
              } else if (this.options.unpairedTags.indexOf(tagName) !== -1) {
                i = result.closeIndex;
              } else {
                const result2 = this.readStopNodeData(xmlData, rawTagName, closeIndex + 1);
                if (!result2) throw new Error(`Unexpected end of ${rawTagName}`);
                i = result2.i;
                tagContent = result2.tagContent;
              }
              const childNode = new xmlNode(tagName);
              if (tagName !== tagExp && attrExpPresent) {
                childNode[":@"] = this.buildAttributesMap(tagExp, jPath, tagName);
              }
              if (tagContent) {
                tagContent = this.parseTextData(tagContent, tagName, jPath, true, attrExpPresent, true, true);
              }
              jPath = jPath.substr(0, jPath.lastIndexOf("."));
              childNode.add(this.options.textNodeName, tagContent);
              this.addChild(currentNode, childNode, jPath);
            } else {
              if (tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1) {
                if (tagName[tagName.length - 1] === "/") {
                  tagName = tagName.substr(0, tagName.length - 1);
                  jPath = jPath.substr(0, jPath.length - 1);
                  tagExp = tagName;
                } else {
                  tagExp = tagExp.substr(0, tagExp.length - 1);
                }
                if (this.options.transformTagName) {
                  tagName = this.options.transformTagName(tagName);
                }
                const childNode = new xmlNode(tagName);
                if (tagName !== tagExp && attrExpPresent) {
                  childNode[":@"] = this.buildAttributesMap(tagExp, jPath, tagName);
                }
                this.addChild(currentNode, childNode, jPath);
                jPath = jPath.substr(0, jPath.lastIndexOf("."));
              } else {
                const childNode = new xmlNode(tagName);
                this.tagsNodeStack.push(currentNode);
                if (tagName !== tagExp && attrExpPresent) {
                  childNode[":@"] = this.buildAttributesMap(tagExp, jPath, tagName);
                }
                this.addChild(currentNode, childNode, jPath);
                currentNode = childNode;
              }
              textData = "";
              i = closeIndex;
            }
          }
        } else {
          textData += xmlData[i];
        }
      }
      return xmlObj.child;
    };
    function addChild(currentNode, childNode, jPath) {
      const result = this.options.updateTag(childNode.tagname, jPath, childNode[":@"]);
      if (result === false) {
      } else if (typeof result === "string") {
        childNode.tagname = result;
        currentNode.addChild(childNode);
      } else {
        currentNode.addChild(childNode);
      }
    }
    var replaceEntitiesValue = function(val) {
      if (this.options.processEntities) {
        for (let entityName in this.docTypeEntities) {
          const entity = this.docTypeEntities[entityName];
          val = val.replace(entity.regx, entity.val);
        }
        for (let entityName in this.lastEntities) {
          const entity = this.lastEntities[entityName];
          val = val.replace(entity.regex, entity.val);
        }
        if (this.options.htmlEntities) {
          for (let entityName in this.htmlEntities) {
            const entity = this.htmlEntities[entityName];
            val = val.replace(entity.regex, entity.val);
          }
        }
        val = val.replace(this.ampEntity.regex, this.ampEntity.val);
      }
      return val;
    };
    function saveTextToParentTag(textData, currentNode, jPath, isLeafNode) {
      if (textData) {
        if (isLeafNode === void 0) isLeafNode = currentNode.child.length === 0;
        textData = this.parseTextData(
          textData,
          currentNode.tagname,
          jPath,
          false,
          currentNode[":@"] ? Object.keys(currentNode[":@"]).length !== 0 : false,
          isLeafNode
        );
        if (textData !== void 0 && textData !== "")
          currentNode.add(this.options.textNodeName, textData);
        textData = "";
      }
      return textData;
    }
    function isItStopNode(stopNodes, jPath, currentTagName) {
      const allNodesExp = "*." + currentTagName;
      for (const stopNodePath in stopNodes) {
        const stopNodeExp = stopNodes[stopNodePath];
        if (allNodesExp === stopNodeExp || jPath === stopNodeExp) return true;
      }
      return false;
    }
    function tagExpWithClosingIndex(xmlData, i, closingChar = ">") {
      let attrBoundary;
      let tagExp = "";
      for (let index = i; index < xmlData.length; index++) {
        let ch = xmlData[index];
        if (attrBoundary) {
          if (ch === attrBoundary) attrBoundary = "";
        } else if (ch === '"' || ch === "'") {
          attrBoundary = ch;
        } else if (ch === closingChar[0]) {
          if (closingChar[1]) {
            if (xmlData[index + 1] === closingChar[1]) {
              return {
                data: tagExp,
                index
              };
            }
          } else {
            return {
              data: tagExp,
              index
            };
          }
        } else if (ch === "	") {
          ch = " ";
        }
        tagExp += ch;
      }
    }
    function findClosingIndex(xmlData, str, i, errMsg) {
      const closingIndex = xmlData.indexOf(str, i);
      if (closingIndex === -1) {
        throw new Error(errMsg);
      } else {
        return closingIndex + str.length - 1;
      }
    }
    function readTagExp(xmlData, i, removeNSPrefix, closingChar = ">") {
      const result = tagExpWithClosingIndex(xmlData, i + 1, closingChar);
      if (!result) return;
      let tagExp = result.data;
      const closeIndex = result.index;
      const separatorIndex = tagExp.search(/\s/);
      let tagName = tagExp;
      let attrExpPresent = true;
      if (separatorIndex !== -1) {
        tagName = tagExp.substring(0, separatorIndex);
        tagExp = tagExp.substring(separatorIndex + 1).trimStart();
      }
      const rawTagName = tagName;
      if (removeNSPrefix) {
        const colonIndex = tagName.indexOf(":");
        if (colonIndex !== -1) {
          tagName = tagName.substr(colonIndex + 1);
          attrExpPresent = tagName !== result.data.substr(colonIndex + 1);
        }
      }
      return {
        tagName,
        tagExp,
        closeIndex,
        attrExpPresent,
        rawTagName
      };
    }
    function readStopNodeData(xmlData, tagName, i) {
      const startIndex = i;
      let openTagCount = 1;
      for (; i < xmlData.length; i++) {
        if (xmlData[i] === "<") {
          if (xmlData[i + 1] === "/") {
            const closeIndex = findClosingIndex(xmlData, ">", i, `${tagName} is not closed`);
            let closeTagName = xmlData.substring(i + 2, closeIndex).trim();
            if (closeTagName === tagName) {
              openTagCount--;
              if (openTagCount === 0) {
                return {
                  tagContent: xmlData.substring(startIndex, i),
                  i: closeIndex
                };
              }
            }
            i = closeIndex;
          } else if (xmlData[i + 1] === "?") {
            const closeIndex = findClosingIndex(xmlData, "?>", i + 1, "StopNode is not closed.");
            i = closeIndex;
          } else if (xmlData.substr(i + 1, 3) === "!--") {
            const closeIndex = findClosingIndex(xmlData, "-->", i + 3, "StopNode is not closed.");
            i = closeIndex;
          } else if (xmlData.substr(i + 1, 2) === "![") {
            const closeIndex = findClosingIndex(xmlData, "]]>", i, "StopNode is not closed.") - 2;
            i = closeIndex;
          } else {
            const tagData = readTagExp(xmlData, i, ">");
            if (tagData) {
              const openTagName = tagData && tagData.tagName;
              if (openTagName === tagName && tagData.tagExp[tagData.tagExp.length - 1] !== "/") {
                openTagCount++;
              }
              i = tagData.closeIndex;
            }
          }
        }
      }
    }
    function parseValue(val, shouldParse, options) {
      if (shouldParse && typeof val === "string") {
        const newval = val.trim();
        if (newval === "true") return true;
        else if (newval === "false") return false;
        else return toNumber(val, options);
      } else {
        if (util.isExist(val)) {
          return val;
        } else {
          return "";
        }
      }
    }
    module2.exports = OrderedObjParser;
  }
});

// node_modules/fast-xml-parser/src/xmlparser/node2json.js
var require_node2json = __commonJS({
  "node_modules/fast-xml-parser/src/xmlparser/node2json.js"(exports) {
    "use strict";
    function prettify(node, options) {
      return compress(node, options);
    }
    function compress(arr, options, jPath) {
      let text;
      const compressedObj = {};
      for (let i = 0; i < arr.length; i++) {
        const tagObj = arr[i];
        const property = propName(tagObj);
        let newJpath = "";
        if (jPath === void 0) newJpath = property;
        else newJpath = jPath + "." + property;
        if (property === options.textNodeName) {
          if (text === void 0) text = tagObj[property];
          else text += "" + tagObj[property];
        } else if (property === void 0) {
          continue;
        } else if (tagObj[property]) {
          let val = compress(tagObj[property], options, newJpath);
          const isLeaf = isLeafTag(val, options);
          if (tagObj[":@"]) {
            assignAttributes(val, tagObj[":@"], newJpath, options);
          } else if (Object.keys(val).length === 1 && val[options.textNodeName] !== void 0 && !options.alwaysCreateTextNode) {
            val = val[options.textNodeName];
          } else if (Object.keys(val).length === 0) {
            if (options.alwaysCreateTextNode) val[options.textNodeName] = "";
            else val = "";
          }
          if (compressedObj[property] !== void 0 && compressedObj.hasOwnProperty(property)) {
            if (!Array.isArray(compressedObj[property])) {
              compressedObj[property] = [compressedObj[property]];
            }
            compressedObj[property].push(val);
          } else {
            if (options.isArray(property, newJpath, isLeaf)) {
              compressedObj[property] = [val];
            } else {
              compressedObj[property] = val;
            }
          }
        }
      }
      if (typeof text === "string") {
        if (text.length > 0) compressedObj[options.textNodeName] = text;
      } else if (text !== void 0) compressedObj[options.textNodeName] = text;
      return compressedObj;
    }
    function propName(obj) {
      const keys = Object.keys(obj);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key !== ":@") return key;
      }
    }
    function assignAttributes(obj, attrMap, jpath, options) {
      if (attrMap) {
        const keys = Object.keys(attrMap);
        const len = keys.length;
        for (let i = 0; i < len; i++) {
          const atrrName = keys[i];
          if (options.isArray(atrrName, jpath + "." + atrrName, true, true)) {
            obj[atrrName] = [attrMap[atrrName]];
          } else {
            obj[atrrName] = attrMap[atrrName];
          }
        }
      }
    }
    function isLeafTag(obj, options) {
      const { textNodeName } = options;
      const propCount = Object.keys(obj).length;
      if (propCount === 0) {
        return true;
      }
      if (propCount === 1 && (obj[textNodeName] || typeof obj[textNodeName] === "boolean" || obj[textNodeName] === 0)) {
        return true;
      }
      return false;
    }
    exports.prettify = prettify;
  }
});

// node_modules/fast-xml-parser/src/xmlparser/XMLParser.js
var require_XMLParser = __commonJS({
  "node_modules/fast-xml-parser/src/xmlparser/XMLParser.js"(exports, module2) {
    "use strict";
    var { buildOptions } = require_OptionsBuilder();
    var OrderedObjParser = require_OrderedObjParser();
    var { prettify } = require_node2json();
    var validator = require_validator();
    var XMLParser3 = class {
      constructor(options) {
        this.externalEntities = {};
        this.options = buildOptions(options);
      }
      /**
       * Parse XML dats to JS object 
       * @param {string|Buffer} xmlData 
       * @param {boolean|Object} validationOption 
       */
      parse(xmlData, validationOption) {
        if (typeof xmlData === "string") {
        } else if (xmlData.toString) {
          xmlData = xmlData.toString();
        } else {
          throw new Error("XML data is accepted in String or Bytes[] form.");
        }
        if (validationOption) {
          if (validationOption === true) validationOption = {};
          const result = validator.validate(xmlData, validationOption);
          if (result !== true) {
            throw Error(`${result.err.msg}:${result.err.line}:${result.err.col}`);
          }
        }
        const orderedObjParser = new OrderedObjParser(this.options);
        orderedObjParser.addExternalEntities(this.externalEntities);
        const orderedResult = orderedObjParser.parseXml(xmlData);
        if (this.options.preserveOrder || orderedResult === void 0) return orderedResult;
        else return prettify(orderedResult, this.options);
      }
      /**
       * Add Entity which is not by default supported by this library
       * @param {string} key 
       * @param {string} value 
       */
      addEntity(key, value) {
        if (value.indexOf("&") !== -1) {
          throw new Error("Entity value can't have '&'");
        } else if (key.indexOf("&") !== -1 || key.indexOf(";") !== -1) {
          throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");
        } else if (value === "&") {
          throw new Error("An entity with value '&' is not permitted");
        } else {
          this.externalEntities[key] = value;
        }
      }
    };
    module2.exports = XMLParser3;
  }
});

// node_modules/fast-xml-parser/src/xmlbuilder/orderedJs2Xml.js
var require_orderedJs2Xml = __commonJS({
  "node_modules/fast-xml-parser/src/xmlbuilder/orderedJs2Xml.js"(exports, module2) {
    "use strict";
    var EOL = "\n";
    function toXml(jArray, options) {
      let indentation = "";
      if (options.format && options.indentBy.length > 0) {
        indentation = EOL;
      }
      return arrToStr(jArray, options, "", indentation);
    }
    function arrToStr(arr, options, jPath, indentation) {
      let xmlStr = "";
      let isPreviousElementTag = false;
      for (let i = 0; i < arr.length; i++) {
        const tagObj = arr[i];
        const tagName = propName(tagObj);
        if (tagName === void 0) continue;
        let newJPath = "";
        if (jPath.length === 0) newJPath = tagName;
        else newJPath = `${jPath}.${tagName}`;
        if (tagName === options.textNodeName) {
          let tagText = tagObj[tagName];
          if (!isStopNode(newJPath, options)) {
            tagText = options.tagValueProcessor(tagName, tagText);
            tagText = replaceEntitiesValue(tagText, options);
          }
          if (isPreviousElementTag) {
            xmlStr += indentation;
          }
          xmlStr += tagText;
          isPreviousElementTag = false;
          continue;
        } else if (tagName === options.cdataPropName) {
          if (isPreviousElementTag) {
            xmlStr += indentation;
          }
          xmlStr += `<![CDATA[${tagObj[tagName][0][options.textNodeName]}]]>`;
          isPreviousElementTag = false;
          continue;
        } else if (tagName === options.commentPropName) {
          xmlStr += indentation + `<!--${tagObj[tagName][0][options.textNodeName]}-->`;
          isPreviousElementTag = true;
          continue;
        } else if (tagName[0] === "?") {
          const attStr2 = attr_to_str(tagObj[":@"], options);
          const tempInd = tagName === "?xml" ? "" : indentation;
          let piTextNodeName = tagObj[tagName][0][options.textNodeName];
          piTextNodeName = piTextNodeName.length !== 0 ? " " + piTextNodeName : "";
          xmlStr += tempInd + `<${tagName}${piTextNodeName}${attStr2}?>`;
          isPreviousElementTag = true;
          continue;
        }
        let newIdentation = indentation;
        if (newIdentation !== "") {
          newIdentation += options.indentBy;
        }
        const attStr = attr_to_str(tagObj[":@"], options);
        const tagStart = indentation + `<${tagName}${attStr}`;
        const tagValue = arrToStr(tagObj[tagName], options, newJPath, newIdentation);
        if (options.unpairedTags.indexOf(tagName) !== -1) {
          if (options.suppressUnpairedNode) xmlStr += tagStart + ">";
          else xmlStr += tagStart + "/>";
        } else if ((!tagValue || tagValue.length === 0) && options.suppressEmptyNode) {
          xmlStr += tagStart + "/>";
        } else if (tagValue && tagValue.endsWith(">")) {
          xmlStr += tagStart + `>${tagValue}${indentation}</${tagName}>`;
        } else {
          xmlStr += tagStart + ">";
          if (tagValue && indentation !== "" && (tagValue.includes("/>") || tagValue.includes("</"))) {
            xmlStr += indentation + options.indentBy + tagValue + indentation;
          } else {
            xmlStr += tagValue;
          }
          xmlStr += `</${tagName}>`;
        }
        isPreviousElementTag = true;
      }
      return xmlStr;
    }
    function propName(obj) {
      const keys = Object.keys(obj);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (!obj.hasOwnProperty(key)) continue;
        if (key !== ":@") return key;
      }
    }
    function attr_to_str(attrMap, options) {
      let attrStr = "";
      if (attrMap && !options.ignoreAttributes) {
        for (let attr in attrMap) {
          if (!attrMap.hasOwnProperty(attr)) continue;
          let attrVal = options.attributeValueProcessor(attr, attrMap[attr]);
          attrVal = replaceEntitiesValue(attrVal, options);
          if (attrVal === true && options.suppressBooleanAttributes) {
            attrStr += ` ${attr.substr(options.attributeNamePrefix.length)}`;
          } else {
            attrStr += ` ${attr.substr(options.attributeNamePrefix.length)}="${attrVal}"`;
          }
        }
      }
      return attrStr;
    }
    function isStopNode(jPath, options) {
      jPath = jPath.substr(0, jPath.length - options.textNodeName.length - 1);
      let tagName = jPath.substr(jPath.lastIndexOf(".") + 1);
      for (let index in options.stopNodes) {
        if (options.stopNodes[index] === jPath || options.stopNodes[index] === "*." + tagName) return true;
      }
      return false;
    }
    function replaceEntitiesValue(textValue, options) {
      if (textValue && textValue.length > 0 && options.processEntities) {
        for (let i = 0; i < options.entities.length; i++) {
          const entity = options.entities[i];
          textValue = textValue.replace(entity.regex, entity.val);
        }
      }
      return textValue;
    }
    module2.exports = toXml;
  }
});

// node_modules/fast-xml-parser/src/xmlbuilder/json2xml.js
var require_json2xml = __commonJS({
  "node_modules/fast-xml-parser/src/xmlbuilder/json2xml.js"(exports, module2) {
    "use strict";
    var buildFromOrderedJs = require_orderedJs2Xml();
    var getIgnoreAttributesFn = require_ignoreAttributes();
    var defaultOptions = {
      attributeNamePrefix: "@_",
      attributesGroupName: false,
      textNodeName: "#text",
      ignoreAttributes: true,
      cdataPropName: false,
      format: false,
      indentBy: "  ",
      suppressEmptyNode: false,
      suppressUnpairedNode: true,
      suppressBooleanAttributes: true,
      tagValueProcessor: function(key, a) {
        return a;
      },
      attributeValueProcessor: function(attrName, a) {
        return a;
      },
      preserveOrder: false,
      commentPropName: false,
      unpairedTags: [],
      entities: [
        { regex: new RegExp("&", "g"), val: "&amp;" },
        //it must be on top
        { regex: new RegExp(">", "g"), val: "&gt;" },
        { regex: new RegExp("<", "g"), val: "&lt;" },
        { regex: new RegExp("'", "g"), val: "&apos;" },
        { regex: new RegExp('"', "g"), val: "&quot;" }
      ],
      processEntities: true,
      stopNodes: [],
      // transformTagName: false,
      // transformAttributeName: false,
      oneListGroup: false
    };
    function Builder(options) {
      this.options = Object.assign({}, defaultOptions, options);
      if (this.options.ignoreAttributes === true || this.options.attributesGroupName) {
        this.isAttribute = function() {
          return false;
        };
      } else {
        this.ignoreAttributesFn = getIgnoreAttributesFn(this.options.ignoreAttributes);
        this.attrPrefixLen = this.options.attributeNamePrefix.length;
        this.isAttribute = isAttribute;
      }
      this.processTextOrObjNode = processTextOrObjNode;
      if (this.options.format) {
        this.indentate = indentate;
        this.tagEndChar = ">\n";
        this.newLine = "\n";
      } else {
        this.indentate = function() {
          return "";
        };
        this.tagEndChar = ">";
        this.newLine = "";
      }
    }
    Builder.prototype.build = function(jObj) {
      if (this.options.preserveOrder) {
        return buildFromOrderedJs(jObj, this.options);
      } else {
        if (Array.isArray(jObj) && this.options.arrayNodeName && this.options.arrayNodeName.length > 1) {
          jObj = {
            [this.options.arrayNodeName]: jObj
          };
        }
        return this.j2x(jObj, 0, []).val;
      }
    };
    Builder.prototype.j2x = function(jObj, level, ajPath) {
      let attrStr = "";
      let val = "";
      const jPath = ajPath.join(".");
      for (let key in jObj) {
        if (!Object.prototype.hasOwnProperty.call(jObj, key)) continue;
        if (typeof jObj[key] === "undefined") {
          if (this.isAttribute(key)) {
            val += "";
          }
        } else if (jObj[key] === null) {
          if (this.isAttribute(key)) {
            val += "";
          } else if (key === this.options.cdataPropName) {
            val += "";
          } else if (key[0] === "?") {
            val += this.indentate(level) + "<" + key + "?" + this.tagEndChar;
          } else {
            val += this.indentate(level) + "<" + key + "/" + this.tagEndChar;
          }
        } else if (jObj[key] instanceof Date) {
          val += this.buildTextValNode(jObj[key], key, "", level);
        } else if (typeof jObj[key] !== "object") {
          const attr = this.isAttribute(key);
          if (attr && !this.ignoreAttributesFn(attr, jPath)) {
            attrStr += this.buildAttrPairStr(attr, "" + jObj[key]);
          } else if (!attr) {
            if (key === this.options.textNodeName) {
              let newval = this.options.tagValueProcessor(key, "" + jObj[key]);
              val += this.replaceEntitiesValue(newval);
            } else {
              val += this.buildTextValNode(jObj[key], key, "", level);
            }
          }
        } else if (Array.isArray(jObj[key])) {
          const arrLen = jObj[key].length;
          let listTagVal = "";
          let listTagAttr = "";
          for (let j = 0; j < arrLen; j++) {
            const item = jObj[key][j];
            if (typeof item === "undefined") {
            } else if (item === null) {
              if (key[0] === "?") val += this.indentate(level) + "<" + key + "?" + this.tagEndChar;
              else val += this.indentate(level) + "<" + key + "/" + this.tagEndChar;
            } else if (typeof item === "object") {
              if (this.options.oneListGroup) {
                const result = this.j2x(item, level + 1, ajPath.concat(key));
                listTagVal += result.val;
                if (this.options.attributesGroupName && item.hasOwnProperty(this.options.attributesGroupName)) {
                  listTagAttr += result.attrStr;
                }
              } else {
                listTagVal += this.processTextOrObjNode(item, key, level, ajPath);
              }
            } else {
              if (this.options.oneListGroup) {
                let textValue = this.options.tagValueProcessor(key, item);
                textValue = this.replaceEntitiesValue(textValue);
                listTagVal += textValue;
              } else {
                listTagVal += this.buildTextValNode(item, key, "", level);
              }
            }
          }
          if (this.options.oneListGroup) {
            listTagVal = this.buildObjectNode(listTagVal, key, listTagAttr, level);
          }
          val += listTagVal;
        } else {
          if (this.options.attributesGroupName && key === this.options.attributesGroupName) {
            const Ks = Object.keys(jObj[key]);
            const L = Ks.length;
            for (let j = 0; j < L; j++) {
              attrStr += this.buildAttrPairStr(Ks[j], "" + jObj[key][Ks[j]]);
            }
          } else {
            val += this.processTextOrObjNode(jObj[key], key, level, ajPath);
          }
        }
      }
      return { attrStr, val };
    };
    Builder.prototype.buildAttrPairStr = function(attrName, val) {
      val = this.options.attributeValueProcessor(attrName, "" + val);
      val = this.replaceEntitiesValue(val);
      if (this.options.suppressBooleanAttributes && val === "true") {
        return " " + attrName;
      } else return " " + attrName + '="' + val + '"';
    };
    function processTextOrObjNode(object, key, level, ajPath) {
      const result = this.j2x(object, level + 1, ajPath.concat(key));
      if (object[this.options.textNodeName] !== void 0 && Object.keys(object).length === 1) {
        return this.buildTextValNode(object[this.options.textNodeName], key, result.attrStr, level);
      } else {
        return this.buildObjectNode(result.val, key, result.attrStr, level);
      }
    }
    Builder.prototype.buildObjectNode = function(val, key, attrStr, level) {
      if (val === "") {
        if (key[0] === "?") return this.indentate(level) + "<" + key + attrStr + "?" + this.tagEndChar;
        else {
          return this.indentate(level) + "<" + key + attrStr + this.closeTag(key) + this.tagEndChar;
        }
      } else {
        let tagEndExp = "</" + key + this.tagEndChar;
        let piClosingChar = "";
        if (key[0] === "?") {
          piClosingChar = "?";
          tagEndExp = "";
        }
        if ((attrStr || attrStr === "") && val.indexOf("<") === -1) {
          return this.indentate(level) + "<" + key + attrStr + piClosingChar + ">" + val + tagEndExp;
        } else if (this.options.commentPropName !== false && key === this.options.commentPropName && piClosingChar.length === 0) {
          return this.indentate(level) + `<!--${val}-->` + this.newLine;
        } else {
          return this.indentate(level) + "<" + key + attrStr + piClosingChar + this.tagEndChar + val + this.indentate(level) + tagEndExp;
        }
      }
    };
    Builder.prototype.closeTag = function(key) {
      let closeTag = "";
      if (this.options.unpairedTags.indexOf(key) !== -1) {
        if (!this.options.suppressUnpairedNode) closeTag = "/";
      } else if (this.options.suppressEmptyNode) {
        closeTag = "/";
      } else {
        closeTag = `></${key}`;
      }
      return closeTag;
    };
    Builder.prototype.buildTextValNode = function(val, key, attrStr, level) {
      if (this.options.cdataPropName !== false && key === this.options.cdataPropName) {
        return this.indentate(level) + `<![CDATA[${val}]]>` + this.newLine;
      } else if (this.options.commentPropName !== false && key === this.options.commentPropName) {
        return this.indentate(level) + `<!--${val}-->` + this.newLine;
      } else if (key[0] === "?") {
        return this.indentate(level) + "<" + key + attrStr + "?" + this.tagEndChar;
      } else {
        let textValue = this.options.tagValueProcessor(key, val);
        textValue = this.replaceEntitiesValue(textValue);
        if (textValue === "") {
          return this.indentate(level) + "<" + key + attrStr + this.closeTag(key) + this.tagEndChar;
        } else {
          return this.indentate(level) + "<" + key + attrStr + ">" + textValue + "</" + key + this.tagEndChar;
        }
      }
    };
    Builder.prototype.replaceEntitiesValue = function(textValue) {
      if (textValue && textValue.length > 0 && this.options.processEntities) {
        for (let i = 0; i < this.options.entities.length; i++) {
          const entity = this.options.entities[i];
          textValue = textValue.replace(entity.regex, entity.val);
        }
      }
      return textValue;
    };
    function indentate(level) {
      return this.options.indentBy.repeat(level);
    }
    function isAttribute(name) {
      if (name.startsWith(this.options.attributeNamePrefix) && name !== this.options.textNodeName) {
        return name.substr(this.attrPrefixLen);
      } else {
        return false;
      }
    }
    module2.exports = Builder;
  }
});

// node_modules/fast-xml-parser/src/fxp.js
var require_fxp = __commonJS({
  "node_modules/fast-xml-parser/src/fxp.js"(exports, module2) {
    "use strict";
    var validator = require_validator();
    var XMLParser3 = require_XMLParser();
    var XMLBuilder = require_json2xml();
    module2.exports = {
      XMLParser: XMLParser3,
      XMLValidator: validator,
      XMLBuilder
    };
  }
});

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => KBKinderboekenPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian12 = require("obsidian");

// src/modal.ts
var import_obsidian7 = require("obsidian");

// src/api.ts
var import_fast_xml_parser = __toESM(require_fxp());
var import_obsidian2 = require("obsidian");

// src/vocab-data.json
var vocab_data_default = {
  publishers: [
    { canonical: "De Vier Windstreken", aliases: ["vier wind", "vier windstreken"] },
    { canonical: "Lemniscaat", aliases: ["lemnis", "lemniscaat"] },
    { canonical: "Gottmer", aliases: ["gottmer"] },
    { canonical: "Querido", aliases: ["querido"] },
    { canonical: "Ploegsma", aliases: ["ploegsma"] },
    { canonical: "De Fontein", aliases: ["fontein", "de fontein"] }
  ],
  creators: [
    { canonical: "Julia Donaldson", aliases: ["julia donaldson", "donaldson"] },
    { canonical: "Axel Scheffler", aliases: ["axel scheffler", "scheffler"] },
    { canonical: "Annie M.G. Schmidt", aliases: ["annie m.g. schmidt", "annie mg schmidt", "schmidt"] },
    { canonical: "Dick Bruna", aliases: ["dick bruna", "bruna"] },
    { canonical: "Roald Dahl", aliases: ["roald dahl", "dahl"] },
    { canonical: "Maria Isabel Sanchez Vegara", aliases: ["isabel sanchez vegara", "vegara"] },
    { canonical: "Rosa Parks", aliases: ["rosa park", "ros park", "rosa parks"] },
    { canonical: "Marie Curie", aliases: ["mari curie", "marie curie"] },
    { canonical: "Anne Frank", aliases: ["ann frank", "anne frank"] },
    { canonical: "Malala Yousafzai", aliases: ["mal yousaf", "malala yousafzai"] }
  ],
  series: [
    { canonical: "Little People, BIG DREAMS", aliases: ["little people", "little people big dreams"] },
    { canonical: "Kikker", aliases: ["kikker serie", "kikker"] },
    { canonical: "Het Muizenhuis", aliases: ["muizenhuis", "het muizenhuis"] }
  ],
  titleStopWords: ["de", "het", "een", "en", "voor", "van", "het", "der", "aan", "door", "serie", "reeks"],
  subjectKeywords: [
    { canonical: "Vriendschap", aliases: ["vriend", "vriendschap"] },
    { canonical: "Avontuur", aliases: ["avontuur", "avonturen"] },
    { canonical: "Geschiedenis", aliases: ["geschiedenis", "history"] }
  ]
};

// src/vocab.ts
var Vocabulary = class {
  constructor(data) {
    this.publisherIndex = /* @__PURE__ */ new Map();
    this.creatorIndex = /* @__PURE__ */ new Map();
    this.seriesIndex = /* @__PURE__ */ new Map();
    this.subjectIndex = /* @__PURE__ */ new Map();
    this.stopWords = /* @__PURE__ */ new Set();
    data.publishers.forEach((entry) => {
      entry.aliases.forEach((alias) => {
        this.publisherIndex.set(alias.toLowerCase(), entry);
      });
    });
    data.creators.forEach((entry) => {
      entry.aliases.forEach((alias) => {
        this.creatorIndex.set(alias.toLowerCase(), entry);
      });
    });
    data.series.forEach((entry) => {
      entry.aliases.forEach((alias) => {
        this.seriesIndex.set(alias.toLowerCase(), entry);
      });
    });
    data.subjectKeywords.forEach((entry) => {
      entry.aliases.forEach((alias) => {
        this.subjectIndex.set(alias.toLowerCase(), entry);
      });
    });
    this.stopWords = new Set(data.titleStopWords.map((w) => w.toLowerCase()));
  }
  matchPublishers(query) {
    return this.matchEntries(query, this.publisherIndex);
  }
  matchCreators(query) {
    return this.matchEntries(query, this.creatorIndex);
  }
  matchSeries(query) {
    return this.matchEntries(query, this.seriesIndex);
  }
  matchSubjects(query) {
    return this.matchEntries(query, this.subjectIndex);
  }
  isStopWord(word) {
    return this.stopWords.has(word.toLowerCase());
  }
  matchEntries(query, index) {
    const lowered = query.toLowerCase();
    const matches = [];
    for (const [alias, entry] of index.entries()) {
      if (lowered.includes(alias)) {
        matches.push({ canonical: entry.canonical, alias });
      }
    }
    return matches;
  }
};
var vocabulary = new Vocabulary(vocab_data_default);

// src/services/WikidataApiClient.ts
var import_obsidian = require("obsidian");
var WikidataApiClient = class {
  constructor() {
    this.BASE_URL = "https://www.wikidata.org/w/api.php";
    this.SPARQL_URL = "https://query.wikidata.org/sparql";
    this.ENTITY_URL = "https://www.wikidata.org/wiki/Special:EntityData";
  }
  /**
   * Search Wikidata entities by text query
   */
  async searchEntities(query, language = "nl", limit = 5) {
    try {
      const params = new URLSearchParams({
        action: "wbsearchentities",
        search: query,
        language,
        limit: limit.toString(),
        format: "json",
        uselang: language
      });
      const response = await (0, import_obsidian.requestUrl)({
        url: `${this.BASE_URL}?${params}`,
        method: "GET",
        headers: {
          "User-Agent": "ObsidianKBPlugin/3.0.3"
        }
      });
      if (response.status !== 200) {
        console.warn("[KB Plugin] Wikidata search failed:", response.status);
        return [];
      }
      const data = response.json;
      if (!data.search || !Array.isArray(data.search)) {
        return [];
      }
      return data.search.map((item) => ({
        id: item.id,
        label: item.label || item.display?.label?.value,
        description: item.description || item.display?.description?.value,
        url: `https://www.wikidata.org/wiki/${item.id}`
      }));
    } catch (error) {
      console.error("[KB Plugin] Wikidata search error:", error);
      return [];
    }
  }
  /**
   * Get detailed information about a Wikidata entity
   */
  async getEntityData(entityId) {
    try {
      const response = await (0, import_obsidian.requestUrl)({
        url: `${this.ENTITY_URL}/${entityId}.json`,
        method: "GET",
        headers: {
          "User-Agent": "ObsidianKBPlugin/3.0.3"
        }
      });
      if (response.status !== 200) {
        console.warn("[KB Plugin] Wikidata entity fetch failed:", response.status, entityId);
        return null;
      }
      return response.json;
    } catch (error) {
      console.error("[KB Plugin] Wikidata entity error:", error, entityId);
      return null;
    }
  }
  /**
   * Get author information from Wikidata
   */
  async getAuthorInfo(authorName) {
    try {
      console.log("[KB Plugin] Searching Wikidata for author:", authorName);
      const searchResults = await this.searchEntities(authorName, "nl", 3);
      if (searchResults.length === 0) {
        console.log("[KB Plugin] No Wikidata results for author:", authorName);
        return null;
      }
      const entityId = searchResults[0].id;
      const entityData = await this.getEntityData(entityId);
      if (!entityData?.entities?.[entityId]) {
        console.log("[KB Plugin] No entity data for:", entityId);
        return null;
      }
      const entity = entityData.entities[entityId];
      const claims = entity.claims || {};
      const authorInfo = {
        id: entityId,
        name: entity.labels?.nl?.value || entity.labels?.en?.value || searchResults[0].label,
        description: entity.descriptions?.nl?.value || entity.descriptions?.en?.value
      };
      if (claims.P569 && claims.P569[0]?.mainsnak?.datavalue?.value?.time) {
        const birthTime = claims.P569[0].mainsnak.datavalue.value.time;
        authorInfo.birthDate = this.parseWikidataDate(birthTime);
      }
      if (claims.P570 && claims.P570[0]?.mainsnak?.datavalue?.value?.time) {
        const deathTime = claims.P570[0].mainsnak.datavalue.value.time;
        authorInfo.deathDate = this.parseWikidataDate(deathTime);
      }
      if (claims.P18 && claims.P18[0]?.mainsnak?.datavalue?.value) {
        const imageFile = claims.P18[0].mainsnak.datavalue.value;
        authorInfo.imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(imageFile)}`;
      }
      if (claims.P106) {
        authorInfo.occupation = claims.P106.map((claim) => claim?.mainsnak?.datavalue?.value?.id).filter((id) => id).map((id) => this.getOccupationLabel(id));
      }
      if (claims.P800) {
        authorInfo.notableWorks = claims.P800.map((claim) => claim?.mainsnak?.datavalue?.value?.id).filter((id) => id);
      }
      const sitelinks = entity.sitelinks || {};
      const nlWiki = sitelinks.nlwiki || sitelinks.enwiki;
      if (nlWiki) {
        authorInfo.wikipediaUrl = `https://nl.wikipedia.org/wiki/${encodeURIComponent(nlWiki.title)}`;
      }
      console.log("[KB Plugin] Found Wikidata author info:", authorInfo);
      return authorInfo;
    } catch (error) {
      console.error("[KB Plugin] Error getting author info:", error);
      return null;
    }
  }
  /**
   * Get character information for popular books
   */
  async getCharacterInfo(characterName) {
    try {
      console.log("[KB Plugin] Searching Wikidata for character:", characterName);
      const searchResults = await this.searchEntities(characterName, "nl", 3);
      if (searchResults.length === 0) {
        return null;
      }
      const entityId = searchResults[0].id;
      const entityData = await this.getEntityData(entityId);
      if (!entityData?.entities?.[entityId]) {
        return null;
      }
      const entity = entityData.entities[entityId];
      const claims = entity.claims || {};
      const characterInfo = {
        id: entityId,
        name: entity.labels?.nl?.value || entity.labels?.en?.value || searchResults[0].label,
        description: entity.descriptions?.nl?.value || entity.descriptions?.en?.value
      };
      if (claims.P18 && claims.P18[0]?.mainsnak?.datavalue?.value) {
        const imageFile = claims.P18[0].mainsnak.datavalue.value;
        characterInfo.imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(imageFile)}`;
      }
      const sitelinks = entity.sitelinks || {};
      const nlWiki = sitelinks.nlwiki || sitelinks.enwiki;
      if (nlWiki) {
        characterInfo.wikipediaUrl = `https://nl.wikipedia.org/wiki/${encodeURIComponent(nlWiki.title)}`;
      }
      console.log("[KB Plugin] Found Wikidata character info:", characterInfo);
      return characterInfo;
    } catch (error) {
      console.error("[KB Plugin] Error getting character info:", error);
      return null;
    }
  }
  /**
   * Search for books by author
   */
  async searchBooksByAuthor(authorName) {
    try {
      const authorInfo = await this.getAuthorInfo(authorName);
      if (!authorInfo) {
        return [];
      }
      const sparqlQuery = `
        SELECT ?book ?bookLabel ?isbn WHERE {
          ?book wdt:P50 wd:${authorInfo.id} .
          OPTIONAL { ?book wdt:P212 ?isbn }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "nl,en". }
        }
        LIMIT 20
      `;
      const response = await (0, import_obsidian.requestUrl)({
        url: this.SPARQL_URL,
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "ObsidianKBPlugin/3.0.3"
        },
        body: `query=${encodeURIComponent(sparqlQuery)}`
      });
      if (response.status !== 200) {
        console.warn("[KB Plugin] Wikidata SPARQL failed:", response.status);
        return [];
      }
      const data = response.json;
      const bindings = data.results?.bindings || [];
      return bindings.map((binding) => ({
        id: binding.book?.value?.split("/").pop(),
        title: binding.bookLabel?.value,
        authors: [authorInfo],
        isbn: binding.isbn?.value
      })).filter((book) => book.title);
    } catch (error) {
      console.error("[KB Plugin] Error searching books by author:", error);
      return [];
    }
  }
  /**
   * Parse Wikidata date format (+YYYY-MM-DDTHH:mm:ssZ)
   */
  parseWikidataDate(wikidataDate) {
    if (!wikidataDate || !wikidataDate.startsWith("+")) {
      return wikidataDate;
    }
    const dateMatch = wikidataDate.match(/\+(\d{4}-\d{2}-\d{2})/);
    return dateMatch ? dateMatch[1] : wikidataDate;
  }
  /**
   * Get human-readable occupation label from Wikidata QID
   */
  getOccupationLabel(qid) {
    const occupationMap = {
      "Q36180": "writer",
      "Q482980": "author",
      "Q49757": "poet",
      "Q28389": "screenwriter",
      "Q6625963": "novelist",
      "Q4853732": "children's writer",
      "Q333634": "translator",
      "Q12144794": "illustrator",
      "Q644687": "illustrator",
      "Q1028181": "painter"
    };
    return occupationMap[qid] || qid;
  }
};

// src/search/QueryAnalyzer.ts
var QueryAnalyzer = class {
  constructor() {
    this.AGE_KEYWORDS = {
      "baby": { min: 0, max: 1, label: "baby" },
      "babies": { min: 0, max: 1, label: "babies" },
      "toddler": { min: 1, max: 3, label: "toddler" },
      "toddlers": { min: 1, max: 3, label: "toddlers" },
      "peuter": { min: 1, max: 3, label: "peuter" },
      "peuters": { min: 1, max: 3, label: "peuters" },
      "preschool": { min: 3, max: 5, label: "preschool" },
      "kleuter": { min: 3, max: 5, label: "kleuter" },
      "kleuterleeftijd": { min: 3, max: 5, label: "kleuterleeftijd" },
      "early reader": { min: 5, max: 7, label: "early reader" },
      "early readers": { min: 5, max: 7, label: "early readers" },
      "beginning reader": { min: 5, max: 7, label: "beginning reader" },
      "jonge lezer": { min: 5, max: 7, label: "jonge lezer" },
      "middle grade": { min: 8, max: 12, label: "middle grade" },
      "young adult": { min: 13, max: 18, label: "young adult" },
      "ya": { min: 13, max: 18, label: "YA" },
      "tiener": { min: 13, max: 18, label: "tiener" }
    };
  }
  /**
   * Main entry point: Parse a natural language query into structured data
   */
  parseQuery(query) {
    const normalized = this.normalizeQuery(query);
    const filters = {
      author: this.detectAuthor(query),
      series: this.detectSeries(query),
      yearRange: this.detectYearRange(query),
      ageRange: this.detectAgeRange(query),
      subjects: this.detectSubjects(query),
      language: this.detectLanguage(query)
    };
    const keywords = this.extractKeywords(query, filters);
    const intent = this.classifyIntent(query, filters);
    return {
      originalQuery: query,
      normalized,
      keywords,
      filters,
      intent
    };
  }
  /**
   * Normalize query: lowercase, trim, remove extra spaces
   */
  normalizeQuery(query) {
    return query.toLowerCase().trim().replace(/\s+/g, " ");
  }
  /**
   * Detect year ranges from natural language
   * Examples:
   * - "after 2015" → { from: 2015 }
   * - "before 2020" → { to: 2020 }
   * - "between 2010 and 2020" → { from: 2010, to: 2020 }
   * - "2015-2020" → { from: 2015, to: 2020 }
   * - "last 5 years" → { from: currentYear - 5 }
   */
  detectYearRange(input) {
    const normalized = input.toLowerCase();
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const afterMatch = normalized.match(/(?:after|since|from)\s+(\d{4})/);
    if (afterMatch) {
      return { from: parseInt(afterMatch[1]) };
    }
    const beforeMatch = normalized.match(/(?:before|until|tot)\s+(\d{4})/);
    if (beforeMatch) {
      return { to: parseInt(beforeMatch[1]) };
    }
    const betweenMatch = normalized.match(/between\s+(\d{4})\s+and\s+(\d{4})/);
    if (betweenMatch) {
      return {
        from: parseInt(betweenMatch[1]),
        to: parseInt(betweenMatch[2])
      };
    }
    const rangeMatch = normalized.match(/(\d{4})\s*[-–]\s*(\d{4})/);
    if (rangeMatch) {
      return {
        from: parseInt(rangeMatch[1]),
        to: parseInt(rangeMatch[2])
      };
    }
    const lastYearsMatch = normalized.match(/(?:last|past)\s+(\d+)\s+years?/);
    if (lastYearsMatch) {
      const yearsAgo = parseInt(lastYearsMatch[1]);
      return { from: currentYear - yearsAgo };
    }
    const exactYearMatch = normalized.match(/(?:in|uit)\s+(\d{4})/);
    if (exactYearMatch) {
      const year = parseInt(exactYearMatch[1]);
      return { from: year, to: year };
    }
    return null;
  }
  /**
   * Detect age ranges from natural language
   * Examples:
   * - "ages 4-6" → { min: 4, max: 6 }
   * - "for 5 year olds" → { min: 5, max: 5 }
   * - "toddlers" → { min: 1, max: 3, label: "toddlers" }
   * - "early readers" → { min: 5, max: 7, label: "early readers" }
   */
  detectAgeRange(input) {
    const normalized = input.toLowerCase();
    const rangeMatch = normalized.match(/(?:ages?|leeftijd)\s*(\d+)\s*[-–]\s*(\d+)/);
    if (rangeMatch) {
      return {
        min: parseInt(rangeMatch[1]),
        max: parseInt(rangeMatch[2])
      };
    }
    const yearOldsMatch = normalized.match(/for\s+(\d+)\s*[-\s]*year[-\s]*olds?/);
    if (yearOldsMatch) {
      const age = parseInt(yearOldsMatch[1]);
      return { min: age, max: age };
    }
    const jaarMatch = normalized.match(/(\d+)\s+jaar(?:\s|$)/);
    if (jaarMatch) {
      const age = parseInt(jaarMatch[1]);
      return { min: age, max: age };
    }
    for (const [keyword, ageRange] of Object.entries(this.AGE_KEYWORDS)) {
      if (normalized.includes(keyword)) {
        return ageRange;
      }
    }
    return null;
  }
  /**
   * Detect author intent from query
   * Examples:
   * - "books by Donaldson" → "Donaldson"
   * - "Julia Donaldson" (capitalized) → "Julia Donaldson"
   * - "Donaldson friendship" → "Donaldson"
   */
  detectAuthor(input) {
    const byMatch = input.match(/(?:by|door)\s+([A-Z][a-zA-Z\s]+?)(?:\s+(?:about|over)|$)/i);
    if (byMatch) {
      return byMatch[1].trim();
    }
    const authorBooksMatch = input.match(/^([A-Z][a-zA-Z\s]+?)\s+(?:books|boeken)/);
    if (authorBooksMatch) {
      return authorBooksMatch[1].trim();
    }
    const normalized = input.toLowerCase();
    const creatorMatches = vocabulary.matchCreators(normalized);
    if (creatorMatches.length > 0) {
      return creatorMatches[0].canonical;
    }
    const words = input.split(/\s+/);
    const capitalizedWords = [];
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (/^[A-Z][a-z]{2,}/.test(word) && !this.isCommonWord(word)) {
        capitalizedWords.push(word);
      }
    }
    if (capitalizedWords.length > 0 && capitalizedWords.length <= 2) {
      return capitalizedWords.join(" ");
    }
    return null;
  }
  /**
   * Detect series from query
   */
  detectSeries(input) {
    const normalized = input.toLowerCase();
    const seriesMatch = input.match(/([A-Z][a-zA-Z\s]+?)\s+(?:series|reeks)/i);
    if (seriesMatch) {
      return seriesMatch[1].trim();
    }
    const seriesMatches = vocabulary.matchSeries(normalized);
    if (seriesMatches.length > 0) {
      return seriesMatches[0].canonical;
    }
    return null;
  }
  /**
   * Detect subjects/topics from query
   */
  detectSubjects(input) {
    const subjects = [];
    const normalized = input.toLowerCase();
    const subjectKeywords = {
      "friendship": "Vriendschap",
      "vriendschap": "Vriendschap",
      "friends": "Vriendschap",
      "vrienden": "Vriendschap",
      "adventure": "Avontuur",
      "avontuur": "Avontuur",
      "animals": "Dieren",
      "dieren": "Dieren",
      "family": "Familie",
      "familie": "Familie",
      "gezin": "Familie",
      "school": "School",
      "love": "Liefde",
      "liefde": "Liefde",
      "fantasy": "Fantasie",
      "fantasie": "Fantasie",
      "science": "Wetenschap",
      "wetenschap": "Wetenschap",
      "history": "Geschiedenis",
      "geschiedenis": "Geschiedenis",
      "nature": "Natuur",
      "natuur": "Natuur",
      "emotions": "Emoties",
      "emoties": "Emoties",
      "gevoelens": "Emoties"
    };
    for (const [keyword, subject] of Object.entries(subjectKeywords)) {
      if (normalized.includes(keyword)) {
        subjects.push(subject);
      }
    }
    const subjectMatches = vocabulary.matchSubjects(normalized);
    subjectMatches.forEach((match) => {
      subjects.push(match.canonical);
    });
    return [...new Set(subjects)];
  }
  /**
   * Detect language from query
   */
  detectLanguage(input) {
    const normalized = input.toLowerCase();
    const languageMap = {
      "dutch": "Nederlands",
      "nederlands": "Nederlands",
      "english": "Engels",
      "engels": "Engels",
      "german": "Duits",
      "duits": "Duits",
      "french": "Frans",
      "frans": "Frans"
    };
    for (const [keyword, language] of Object.entries(languageMap)) {
      if (normalized.includes(keyword)) {
        return language;
      }
    }
    return null;
  }
  /**
   * Extract keywords after removing detected filters
   */
  extractKeywords(query, filters) {
    let remaining = query;
    if (filters.author) {
      remaining = remaining.replace(new RegExp(`\\b${filters.author}\\b`, "gi"), "");
    }
    if (filters.series) {
      remaining = remaining.replace(new RegExp(`\\b${filters.series}\\b`, "gi"), "");
    }
    remaining = remaining.replace(/\b\d{4}\b/g, "");
    remaining = remaining.replace(/\b(?:ages?|year|leeftijd|jaar)\s*\d+[-–]?\d*/gi, "");
    remaining = remaining.replace(/\b(?:by|door|about|over|for|voor|in|uit)\b/gi, "");
    if (filters.subjects) {
      for (const subject of filters.subjects) {
        remaining = remaining.replace(new RegExp(`\\b${subject}\\b`, "gi"), "");
      }
    }
    const keywords = remaining.split(/\s+/).map((w) => w.trim()).filter((w) => w.length > 2 && !this.isCommonWord(w));
    return [...new Set(keywords)];
  }
  /**
   * Classify search intent based on filters
   */
  classifyIntent(query, filters) {
    if (/^\d{10,13}$/.test(query.replace(/[-\s]/g, ""))) {
      return "isbn-lookup";
    }
    if (filters.author && !filters.series && (!filters.subjects || filters.subjects.length === 0)) {
      return "author-works";
    }
    if (filters.series) {
      return "explore-series";
    }
    if (filters.subjects && filters.subjects.length > 0 && !filters.author) {
      return "subject-browse";
    }
    return "find-books";
  }
  /**
   * Check if word is a common word (articles, prepositions, etc.)
   */
  isCommonWord(word) {
    const commonWords = /* @__PURE__ */ new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "about",
      "as",
      "into",
      "like",
      "through",
      "after",
      "over",
      "between",
      "out",
      "against",
      "during",
      "without",
      "before",
      "under",
      "around",
      "among",
      // Dutch
      "de",
      "het",
      "een",
      "en",
      "of",
      "maar",
      "in",
      "op",
      "aan",
      "voor",
      "van",
      "met",
      "door",
      "over",
      "als",
      "naar",
      "bij",
      "uit",
      "om",
      "tot",
      "tegen",
      "zonder",
      "onder",
      "tussen",
      "tijdens"
    ]);
    return commonWords.has(word.toLowerCase());
  }
  /**
   * Generate a human-readable description of parsed query
   */
  describeQuery(parsed) {
    const parts = [];
    if (parsed.filters.author) {
      parts.push(`by ${parsed.filters.author}`);
    }
    if (parsed.filters.series) {
      parts.push(`in ${parsed.filters.series} series`);
    }
    if (parsed.filters.subjects && parsed.filters.subjects.length > 0) {
      parts.push(`about ${parsed.filters.subjects.join(", ")}`);
    }
    if (parsed.filters.yearRange) {
      const { from, to } = parsed.filters.yearRange;
      if (from && to) {
        parts.push(`published ${from}-${to}`);
      } else if (from) {
        parts.push(`published after ${from}`);
      } else if (to) {
        parts.push(`published before ${to}`);
      }
    }
    if (parsed.filters.ageRange) {
      const { min, max, label } = parsed.filters.ageRange;
      if (label) {
        parts.push(`for ${label}`);
      } else if (min === max) {
        parts.push(`for age ${min}`);
      } else {
        parts.push(`for ages ${min}-${max}`);
      }
    }
    if (parsed.filters.language) {
      parts.push(`in ${parsed.filters.language}`);
    }
    if (parsed.keywords.length > 0) {
      parts.push(`matching "${parsed.keywords.join(" ")}"`);
    }
    return parts.length > 0 ? `Books ${parts.join(", ")}` : `Books matching "${parsed.originalQuery}"`;
  }
};

// src/api.ts
var KB_SRU_BASE_URL = "https://jsru.kb.nl/sru/sru";
var KB_COLLECTION = "GGC";
var KBApiClient = class {
  constructor(prioritizeChildrensBooks = false, useFuzzySearch = true, enableLinkedDataEnrichment = true, enableWikidataEnrichment = true) {
    this.prioritizeChildrensBooks = false;
    this.useFuzzySearch = true;
    this.searchCache = /* @__PURE__ */ new Map();
    this.expansionCache = /* @__PURE__ */ new Map();
    this.linkedDataCache = /* @__PURE__ */ new Map();
    this.CACHE_TTL = 10 * 60 * 1e3;
    // 10 minutes
    this.enableLinkedDataEnrichment = true;
    this.enableWikidataEnrichment = true;
    this.parser = new import_fast_xml_parser.XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseTagValue: false,
      trimValues: true
    });
    this.prioritizeChildrensBooks = prioritizeChildrensBooks;
    this.useFuzzySearch = useFuzzySearch;
    this.enableLinkedDataEnrichment = enableLinkedDataEnrichment;
    this.enableWikidataEnrichment = enableWikidataEnrichment;
    this.wikidataClient = new WikidataApiClient();
    this.queryAnalyzer = new QueryAnalyzer();
  }
  /**
   * Update children's book search preference
   */
  setPrioritizeChildrensBooks(enabled) {
    this.prioritizeChildrensBooks = enabled;
  }
  /**
   * Update fuzzy search preference
   */
  setUseFuzzySearch(enabled) {
    this.useFuzzySearch = enabled;
  }
  /**
   * Toggle linked data enrichment
   */
  setLinkedDataEnrichment(enabled) {
    this.enableLinkedDataEnrichment = enabled;
  }
  /**
   * Search for books by title or author with improved query construction
   */
  async searchBooks(query, maxResults = 10, startRecord = 1) {
    try {
      const cacheKey = `${query}:${maxResults}:${startRecord}:${this.prioritizeChildrensBooks}`;
      const cached = this.searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log("[KB Plugin] Returning cached results for:", query);
        return cached.results;
      }
      console.log("[KB Plugin] Searching for:", query, `(records ${startRecord}-${startRecord + maxResults - 1})`, this.prioritizeChildrensBooks ? "(prioritizing children's books)" : "");
      const searchPayload = this.buildSearchQuery(query);
      const encodedQuery = encodeURIComponent(searchPayload.query);
      const sortSegment = searchPayload.sortKeys ? `&sortKeys=${encodeURIComponent(searchPayload.sortKeys)}` : "";
      const url = `${KB_SRU_BASE_URL}?x-collection=${KB_COLLECTION}&version=1.2&operation=searchRetrieve&query=${encodedQuery}&startRecord=${startRecord}&maximumRecords=${maxResults}&x-fields=ISBN${sortSegment}`;
      const results = await this.performSearch(url);
      if (this.prioritizeChildrensBooks && results.length < 3) {
        console.log("[KB Plugin] Few children's book results, also trying general search...");
        const generalPayload = this.buildSearchQuery(query, false);
        const generalSortSegment = generalPayload.sortKeys ? `&sortKeys=${encodeURIComponent(generalPayload.sortKeys)}` : "";
        const generalUrl = `${KB_SRU_BASE_URL}?x-collection=${KB_COLLECTION}&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(generalPayload.query)}&maximumRecords=${maxResults - results.length}&x-fields=ISBN${generalSortSegment}`;
        const generalResults = await this.performSearch(generalUrl);
        const existingISBNs = new Set(results.map((r) => r.isbn));
        const additionalResults = generalResults.filter((r) => !existingISBNs.has(r.isbn));
        results.push(...additionalResults.slice(0, maxResults - results.length));
      }
      this.searchCache.set(cacheKey, { results, timestamp: Date.now() });
      return results;
    } catch (error) {
      console.error("[KB Plugin] Search error:", error);
      new import_obsidian2.Notice("Search failed. Please check your internet connection.");
      return [];
    }
  }
  /**
   * Build intelligent search query with proper operators
   */
  buildSearchQuery(query, useChildrensFilter = this.prioritizeChildrensBooks) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return { query: '""' };
    }
    if (this.isCqlQuery(trimmedQuery)) {
      console.log("[KB Plugin] Detected CQL query, using as-is:", trimmedQuery);
      return { query: trimmedQuery };
    }
    const parsedQuery = this.queryAnalyzer.parseQuery(trimmedQuery);
    console.log("[KB Plugin] Parsed query:", this.queryAnalyzer.describeQuery(parsedQuery));
    const analysis = this.analyzeQuery(trimmedQuery);
    const structuredClauses = [];
    structuredClauses.push(...this.buildClausesFromParsedQuery(parsedQuery));
    const fieldClauses = this.extractFieldClauses(trimmedQuery);
    structuredClauses.push(...fieldClauses.clauses);
    let sortKeys = fieldClauses.sortKeys;
    if (!fieldClauses.handledIsbn) {
      const isbnClause = this.detectIsbnClause(trimmedQuery);
      if (isbnClause) {
        structuredClauses.push(isbnClause);
      }
    }
    if (analysis.creators.length > 0) {
      analysis.creators.forEach((match) => {
        structuredClauses.push(`dc.creator all "${this.escapeCql(match.canonical)}"`);
      });
    } else {
      const explicitAuthorClause = this.detectExplicitAuthorClause(trimmedQuery);
      if (explicitAuthorClause) {
        structuredClauses.push(explicitAuthorClause);
      }
    }
    if (analysis.subjects.length > 0) {
      analysis.subjects.forEach((match) => {
        structuredClauses.push(`dc.subject all "${this.escapeCql(match.canonical)}"`);
      });
    }
    structuredClauses.push(...this.detectSeriesClauses(trimmedQuery, analysis));
    structuredClauses.push(...this.expandPartialQuery(trimmedQuery, analysis));
    structuredClauses.push(...this.buildCombinedClauses(trimmedQuery, analysis));
    structuredClauses.push(`cql.serverChoice all "${this.escapeCql(trimmedQuery)}"`);
    const uniqueClauses = this.dedupeClauses(structuredClauses);
    let baseQuery = uniqueClauses.length === 1 ? uniqueClauses[0] : uniqueClauses.map((clause) => `(${clause})`).join(" OR ");
    if (!sortKeys) {
      const yearMatch = trimmedQuery.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        sortKeys = "year,,1";
      }
    }
    if (useChildrensFilter) {
      baseQuery = `(${baseQuery}) AND (dc.subject=Jeugd OR dc.subject="Jeugdliteratuur" OR dc.subject="Prentenboeken")`;
    }
    return { query: baseQuery, sortKeys };
  }
  /**
   * Build CQL clauses from QueryAnalyzer parsed query
   */
  buildClausesFromParsedQuery(parsed) {
    const clauses = [];
    if (parsed.filters.author) {
      clauses.push(`dc.creator all "${this.escapeCql(parsed.filters.author)}"`);
    }
    if (parsed.filters.series) {
      clauses.push(`dc.title all "${this.escapeCql(parsed.filters.series)}"`);
    }
    if (parsed.filters.subjects && parsed.filters.subjects.length > 0) {
      parsed.filters.subjects.forEach((subject) => {
        clauses.push(`dc.subject all "${this.escapeCql(subject)}"`);
      });
    }
    if (parsed.filters.yearRange) {
      const { from, to } = parsed.filters.yearRange;
      if (from && to && from === to) {
        clauses.push(`dc.date=${from}`);
      } else if (from && to) {
        clauses.push(`(dc.date>=${from} AND dc.date<=${to})`);
      } else if (from) {
        clauses.push(`dc.date>=${from}`);
      } else if (to) {
        clauses.push(`dc.date<=${to}`);
      }
    }
    if (parsed.filters.ageRange) {
      const { min, max, label } = parsed.filters.ageRange;
      if (label) {
        const ageSubjects = [];
        if (min <= 3) ageSubjects.push("Peuter", "Baby");
        if (min <= 5 && max >= 3) ageSubjects.push("Kleuter");
        if (min <= 7 && max >= 5) ageSubjects.push("Beginnende lezers");
        if (min <= 12 && max >= 8) ageSubjects.push("Jeugd");
        if (ageSubjects.length > 0) {
          const ageClause = ageSubjects.map((s) => `dc.subject="${s}"`).join(" OR ");
          clauses.push(`(${ageClause})`);
        }
      }
    }
    if (parsed.filters.language) {
      clauses.push(`dc.language="${this.escapeCql(parsed.filters.language)}"`);
    }
    if (parsed.keywords.length > 0) {
      const keywordQuery = parsed.keywords.join(" ");
      clauses.push(`cql.serverChoice all "${this.escapeCql(keywordQuery)}"`);
    }
    return clauses;
  }
  analyzeQuery(rawQuery) {
    const rawTokens = rawQuery.split(/\s+/).filter((token) => token.length > 0);
    const normalized = rawQuery.toLowerCase();
    const tokens = normalized.split(/\s+/).filter((token) => token.length > 0);
    return {
      normalized,
      raw: rawQuery,
      rawTokens,
      tokens,
      creators: vocabulary.matchCreators(normalized),
      publishers: vocabulary.matchPublishers(normalized),
      series: vocabulary.matchSeries(normalized),
      subjects: vocabulary.matchSubjects(normalized)
    };
  }
  extractFieldClauses(query) {
    const clauses = [];
    let remainder = query;
    let sortKeys;
    let handledIsbn = false;
    const regex = /(author|creator|titel|title|subject|onderwerp|publisher|uitgever|serie|series|reeks|isbn|ppn|sort):("[^"]+"|\S+)/gi;
    let match;
    while ((match = regex.exec(query)) !== null) {
      const field = match[1].toLowerCase();
      const value = this.stripQuotes(match[2]);
      const escapedValue = this.escapeCql(value);
      remainder = remainder.replace(match[0], " ");
      switch (field) {
        case "author":
        case "creator":
          clauses.push(`dc.creator all "${escapedValue}"`);
          break;
        case "titel":
        case "title":
          clauses.push(`dc.title all "${escapedValue}"`);
          break;
        case "subject":
        case "onderwerp":
          clauses.push(`dc.subject all "${escapedValue}"`);
          break;
        case "publisher":
        case "uitgever":
          clauses.push(`dc.publisher all "${escapedValue}"`);
          break;
        case "serie":
        case "series":
        case "reeks":
          clauses.push(`dc.title all "${escapedValue}" OR dc.relation all "${escapedValue}"`);
          break;
        case "isbn":
          clauses.push(`(bath.isbn="${escapedValue}" OR dc.identifier all "${escapedValue}")`);
          handledIsbn = true;
          break;
        case "ppn":
          clauses.push(`dc.identifier all "PPN ${escapedValue}" OR dc.identifier all "${escapedValue}"`);
          break;
        case "sort":
          sortKeys = this.mapSortValue(value);
          break;
      }
    }
    return { clauses, remainder: remainder.replace(/\s+/g, " ").trim(), sortKeys, handledIsbn };
  }
  detectIsbnClause(query) {
    const match = query.replace(/[^0-9Xx]/g, " ").match(/(97[89]\d{10}|\b\d{9}[\dXx]\b)/);
    if (!match) {
      return void 0;
    }
    const isbn = match[0].toUpperCase();
    return `(bath.isbn="${isbn}" OR dc.identifier all "${isbn}")`;
  }
  detectExplicitAuthorClause(query) {
    const match = query.match(/^([^,]+),\s*(.+)$/);
    if (!match) {
      return void 0;
    }
    const normalizedName = `${match[1].trim()}, ${match[2].trim()}`;
    const escaped = this.escapeCql(normalizedName);
    if (this.useFuzzySearch) {
      return `(dc.creator="${escaped}" OR dc.creator all "${escaped}")`;
    }
    return `dc.creator="${escaped}"`;
  }
  detectSeriesClauses(query, analysis) {
    const clauses = [];
    analysis.series.forEach((match) => {
      clauses.push(`dc.relation all "${this.escapeCql(match.canonical)}"`);
    });
    if (/\b(serie|reeks|verzameling)\b/i.test(query)) {
      const seriesName = query.replace(/\b(serie|reeks|verzameling)\b/gi, " ").replace(/"/g, " ").trim();
      if (seriesName) {
        clauses.push(`dc.title all "${this.escapeCql(seriesName)}" OR dc.relation all "${this.escapeCql(seriesName)}"`);
      }
    }
    return clauses;
  }
  expandPartialQuery(query, analysis) {
    if (!this.useFuzzySearch) {
      return [];
    }
    const cacheKey = analysis.normalized;
    if (this.expansionCache.has(cacheKey)) {
      return this.expansionCache.get(cacheKey);
    }
    const clauses = [];
    const matches = [...analysis.publishers, ...analysis.creators, ...analysis.series];
    if (matches.length === 0) {
      this.expansionCache.set(cacheKey, clauses);
      return clauses;
    }
    const cleaned = this.removeAliasesFromQuery(analysis.normalized, matches);
    const keywords = cleaned.split(/\s+/).filter((token) => token.length > 2 && !vocabulary.isStopWord(token));
    const keywordPhrase = keywords.join(" ").trim();
    if (analysis.publishers.length > 0 && analysis.creators.length > 0) {
      analysis.publishers.forEach((publisher) => {
        analysis.creators.forEach((creator) => {
          clauses.push(`(dc.publisher all "${this.escapeCql(publisher.canonical)}" AND dc.creator all "${this.escapeCql(creator.canonical)}")`);
        });
      });
    }
    if (analysis.publishers.length > 0 && keywordPhrase) {
      analysis.publishers.forEach((publisher) => {
        clauses.push(`(dc.publisher all "${this.escapeCql(publisher.canonical)}" AND dc.title all "${this.escapeCql(keywordPhrase)}")`);
      });
    }
    if (analysis.creators.length > 0 && keywordPhrase) {
      analysis.creators.forEach((creator) => {
        clauses.push(`(dc.creator all "${this.escapeCql(creator.canonical)}" AND dc.title all "${this.escapeCql(keywordPhrase)}")`);
      });
    }
    if (analysis.series.length > 0 && keywordPhrase) {
      analysis.series.forEach((series) => {
        clauses.push(`(dc.relation all "${this.escapeCql(series.canonical)}" AND dc.title all "${this.escapeCql(keywordPhrase)}")`);
      });
    }
    this.expansionCache.set(cacheKey, clauses);
    return clauses;
  }
  buildCombinedClauses(query, analysis) {
    const clauses = [];
    const lowered = query.toLowerCase();
    const byMatch = lowered.match(/(.+?)\s+(door|by)\s+(.+)/i);
    if (byMatch) {
      const titlePart = byMatch[1].trim();
      const authorPart = byMatch[3].trim();
      clauses.push(`(dc.title all "${this.escapeCql(titlePart)}" AND dc.creator all "${this.escapeCql(authorPart)}")`);
    }
    const dashMatch = query.match(/(.+?)\s*[–-]\s*(.+)/);
    if (dashMatch) {
      const first = dashMatch[1].trim();
      const second = dashMatch[2].trim();
      clauses.push(`(dc.title all "${this.escapeCql(first)}" AND cql.serverChoice all "${this.escapeCql(second)}")`);
    }
    if (analysis.creators.length > 0) {
      const cleaned = this.removeAliasesFromOriginal(query, analysis.creators).replace(/[,:;]+/g, " ").trim();
      if (cleaned && cleaned !== query) {
        analysis.creators.forEach((creator) => {
          clauses.push(`(dc.title all "${this.escapeCql(cleaned)}" AND dc.creator all "${this.escapeCql(creator.canonical)}")`);
        });
      }
    }
    return clauses;
  }
  removeAliasesFromQuery(query, matches) {
    let cleaned = query;
    matches.forEach((match) => {
      const regex = new RegExp(`\\b${this.escapeRegex(match.alias)}\\b`, "gi");
      cleaned = cleaned.replace(regex, " ");
    });
    return cleaned.replace(/\s+/g, " ").trim();
  }
  removeAliasesFromOriginal(query, matches) {
    let cleaned = query;
    matches.forEach((match) => {
      const regex = new RegExp(`\\b${this.escapeRegex(match.alias)}\\b`, "gi");
      cleaned = cleaned.replace(regex, " ");
    });
    return cleaned.replace(/\s+/g, " ").trim();
  }
  mapSortValue(value) {
    const normalized = value.toLowerCase();
    if (["recent", "desc", "newest", "latest"].includes(normalized)) {
      return "year,,1";
    }
    if (["oldest", "asc"].includes(normalized)) {
      return "year,,0";
    }
    if (["title", "titel"].includes(normalized)) {
      return "title,,1";
    }
    return void 0;
  }
  dedupeClauses(clauses) {
    return Array.from(new Set(clauses.filter((clause) => clause && clause.trim().length > 0)));
  }
  escapeCql(value) {
    return value.replace(/"/g, '\\"');
  }
  stripQuotes(value) {
    return value.replace(/^"/, "").replace(/"$/, "");
  }
  escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  /**
   * Check if a query string is already in CQL format
   */
  isCqlQuery(query) {
    return /\b(dc\.|dcterms\.|bath\.|cql\.)\w+\s*(=|all|any|exact)\s*/.test(query);
  }
  /**
   * Search for a book by ISBN
   */
  async searchByISBN(isbn) {
    try {
      console.log("[KB Plugin] Searching by ISBN:", isbn);
      const cleanISBN = isbn.replace(/[^0-9X]/gi, "");
      if (!cleanISBN) {
        new import_obsidian2.Notice("Invalid ISBN format");
        return null;
      }
      const url = `${KB_SRU_BASE_URL}?x-collection=${KB_COLLECTION}&version=1.2&operation=searchRetrieve&query=ISBN=${cleanISBN}&maximumRecords=1&x-fields=ISBN`;
      const results = await this.performSearch(url);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error("[KB Plugin] ISBN search error:", error);
      new import_obsidian2.Notice("ISBN search failed. Please try again.");
      return null;
    }
  }
  async performSearch(url) {
    try {
      console.log("[KB Plugin] API URL:", url);
      const response = await (0, import_obsidian2.requestUrl)({
        url,
        method: "GET",
        headers: {
          "Accept": "application/xml, text/xml, */*",
          "User-Agent": "ObsidianKBPlugin/0.1.3"
        },
        throw: false
        // Don't throw on non-200 status
      });
      console.log("[KB Plugin] Response status:", response.status);
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`);
      }
      const xmlText = response.text;
      if (!xmlText || xmlText.trim().length === 0) {
        console.error("[KB Plugin] Empty response from API");
        new import_obsidian2.Notice("Received empty response from KB API");
        return [];
      }
      console.log("[KB Plugin] Response length:", xmlText.length);
      const parsed = this.parser.parse(xmlText);
      if (!parsed) {
        console.error("[KB Plugin] Failed to parse XML");
        return [];
      }
      const books = this.parseSearchResults(parsed);
      if (books.length > 0 && this.enableLinkedDataEnrichment) {
        await this.enrichLinkedData(books);
      }
      if (books.length > 0 && this.enableWikidataEnrichment) {
        await this.enrichWikidataProfiles(books);
      }
      return books;
    } catch (error) {
      console.error("[KB Plugin] API error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      new import_obsidian2.Notice(`API error: ${errorMessage}`);
      return [];
    }
  }
  parseSearchResults(data) {
    const records = this.extractRecords(data);
    if (!records || records.length === 0) {
      return [];
    }
    return records.map((record) => this.parseRecord(record)).filter((book) => book !== null);
  }
  extractRecords(data) {
    try {
      const searchRetrieveResponse = data["srw:searchRetrieveResponse"];
      if (!searchRetrieveResponse) return [];
      const records = searchRetrieveResponse["srw:records"]?.["srw:record"];
      if (!records) return [];
      return Array.isArray(records) ? records : [records];
    } catch (error) {
      console.error("Error extracting records:", error);
      return [];
    }
  }
  parseRecord(record) {
    try {
      const recordData = record["srw:recordData"];
      if (!recordData) {
        console.error("[KB Plugin] No recordData found in record");
        return null;
      }
      const dc = recordData;
      console.log("[KB Plugin] Parsing record with title:", this.extractField(dc, "dc:title"));
      const allIsbns = this.extractAllISBNs(dc);
      const primaryIsbn = allIsbns.length > 0 ? allIsbns[0] : void 0;
      const series = this.extractSeries(dc);
      const identifiers = this.extractMultipleFields(dc, "dc:identifier");
      const recordIdentifier = this.extractField(dc, "dcx:recordIdentifier");
      const { ppn, ppnUri } = this.extractPpnDetails(identifiers, recordIdentifier);
      const metadata = {
        title: this.extractField(dc, "dc:title") || "Unknown Title",
        authors: this.extractMultipleFields(dc, "dc:creator"),
        isbn: primaryIsbn,
        allIsbns,
        publisher: this.extractField(dc, "dc:publisher"),
        publishYear: this.extractYear(dc),
        language: this.extractField(dc, "dc:language"),
        description: this.extractField(dc, "dc:description") || this.extractField(dc, "dcterms:abstract"),
        subjects: this.extractMultipleFields(dc, "dc:subject"),
        series,
        identifier: identifiers[0],
        ppn,
        ppnUri,
        coverUrl: void 0
        // Cover will be populated by Bol.com enrichment if enabled
      };
      return metadata;
    } catch (error) {
      console.error("[KB Plugin] Error parsing record:", error);
      return null;
    }
  }
  extractField(dc, fieldName) {
    const field = dc[fieldName];
    if (!field) return void 0;
    if (Array.isArray(field)) {
      return field[0]?.["#text"] || field[0] || void 0;
    }
    return field["#text"] || field || void 0;
  }
  extractMultipleFields(dc, fieldName) {
    const field = dc[fieldName];
    if (!field) return [];
    if (Array.isArray(field)) {
      return field.map((f) => f["#text"] || f).filter((v) => v);
    }
    const value = field["#text"] || field;
    return value ? [value] : [];
  }
  extractISBN(dc) {
    const identifiers = this.extractMultipleFields(dc, "dc:identifier");
    for (const id of identifiers) {
      if (typeof id === "string" && id.match(/ISBN|isbn|978|979/)) {
        const cleaned = id.replace(/ISBN:?\s*/i, "").trim();
        return cleaned;
      }
    }
    return void 0;
  }
  extractPpnDetails(identifiers, recordIdentifier) {
    if (recordIdentifier && typeof recordIdentifier === "string") {
      const ppnMatch = recordIdentifier.match(/PPN[?=]PPN=(\d{8,10})/i);
      if (ppnMatch) {
        const ppn = ppnMatch[1];
        console.log("[KB Plugin] Found PPN in dcx:recordIdentifier:", ppn);
        return { ppn, ppnUri: `https://data.bibliotheken.nl/doc/nbt/${ppn}` };
      }
    }
    for (const id of identifiers) {
      if (typeof id !== "string") {
        continue;
      }
      const directMatch = id.match(/PPN\s*([0-9]{8,10})/i);
      if (directMatch) {
        const ppn = directMatch[1];
        console.log("[KB Plugin] Found PPN in dc:identifier:", ppn);
        return { ppn, ppnUri: `https://data.bibliotheken.nl/doc/nbt/${ppn}` };
      }
      const uriMatch = id.match(/nbt\/(\d{8,10})/i);
      if (uriMatch) {
        const ppn = uriMatch[1];
        console.log("[KB Plugin] Found PPN URI in dc:identifier:", ppn);
        return { ppn, ppnUri: `https://data.bibliotheken.nl/doc/nbt/${ppn}` };
      }
    }
    console.log("[KB Plugin] No PPN found in identifiers or recordIdentifier");
    return {};
  }
  /**
   * Extract all ISBNs from the record (for cover fallback)
   */
  extractAllISBNs(dc) {
    const identifiers = this.extractMultipleFields(dc, "dc:identifier");
    const isbns = [];
    for (const id of identifiers) {
      if (typeof id === "string" && id.match(/ISBN|isbn|978|979/)) {
        const cleaned = id.replace(/ISBN:?\s*/i, "").trim();
        if (cleaned && !isbns.includes(cleaned)) {
          isbns.push(cleaned);
        }
      }
    }
    return isbns;
  }
  async enrichLinkedData(records) {
    await Promise.all(records.map((record) => this.fetchLinkedData(record)));
  }
  /**
   * Enrich author profiles with Wikidata information
   */
  async enrichWikidataProfiles(records) {
    await Promise.all(records.map((record) => this.fetchWikidataProfiles(record)));
  }
  /**
   * Extract Wikidata ID from a Wikidata URI
   */
  extractWikidataId(uri) {
    const match = uri.match(/wikidata\.org\/(entity|wiki)\/(Q\d+)/);
    return match ? match[2] : null;
  }
  /**
   * Fetch Wikidata profiles for all creators in a book record
   */
  async fetchWikidataProfiles(record) {
    if (!record.linkedData?.creators || record.linkedData.creators.length === 0) {
      return;
    }
    console.log("[KB Plugin] Enriching Wikidata profiles for:", record.title);
    await Promise.all(
      record.linkedData.creators.map(async (creator) => {
        if (!creator.sameAs || creator.sameAs.length === 0) {
          return;
        }
        const wikidataUri = creator.sameAs.find((uri) => uri.includes("wikidata.org"));
        if (!wikidataUri) {
          return;
        }
        const wikidataId = this.extractWikidataId(wikidataUri);
        if (!wikidataId) {
          console.log("[KB Plugin] Could not extract Wikidata ID from:", wikidataUri);
          return;
        }
        try {
          console.log("[KB Plugin] Fetching Wikidata profile for:", creator.label, wikidataId);
          const entityData = await this.wikidataClient.getEntityData(wikidataId);
          if (!entityData?.entities?.[wikidataId]) {
            console.log("[KB Plugin] No Wikidata entity data for:", wikidataId);
            return;
          }
          const entity = entityData.entities[wikidataId];
          const claims = entity.claims || {};
          const wikidataProfile = {
            id: wikidataId,
            name: entity.labels?.nl?.value || entity.labels?.en?.value || creator.label || "",
            description: entity.descriptions?.nl?.value || entity.descriptions?.en?.value,
            birthDate: this.extractWikidataDate(claims.P569),
            deathDate: this.extractWikidataDate(claims.P570),
            imageUrl: this.extractWikidataImage(claims.P18),
            wikipediaUrl: this.extractWikipediaUrl(entity.sitelinks),
            occupation: this.extractOccupations(claims.P106),
            notableWorks: this.extractNotableWorks(claims.P800)
          };
          Object.keys(wikidataProfile).forEach((key) => {
            if (wikidataProfile[key] === void 0) {
              delete wikidataProfile[key];
            }
          });
          creator.wikidataProfile = wikidataProfile;
          console.log("[KB Plugin] Wikidata profile enriched for:", creator.label, wikidataProfile);
        } catch (error) {
          console.error("[KB Plugin] Error fetching Wikidata profile:", error);
        }
      })
    );
  }
  /**
   * Extract date from Wikidata claims
   */
  extractWikidataDate(claims) {
    if (!claims || claims.length === 0) {
      return void 0;
    }
    const dateValue = claims[0]?.mainsnak?.datavalue?.value?.time;
    if (!dateValue || !dateValue.startsWith("+")) {
      return void 0;
    }
    const dateMatch = dateValue.match(/\+(\d{4}-\d{2}-\d{2})/);
    return dateMatch ? dateMatch[1] : void 0;
  }
  /**
   * Extract image URL from Wikidata claims
   */
  extractWikidataImage(claims) {
    if (!claims || claims.length === 0) {
      return void 0;
    }
    const imageFile = claims[0]?.mainsnak?.datavalue?.value;
    if (!imageFile) {
      return void 0;
    }
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(imageFile)}`;
  }
  /**
   * Extract Wikipedia URL from Wikidata sitelinks
   */
  extractWikipediaUrl(sitelinks) {
    if (!sitelinks) {
      return void 0;
    }
    const nlWiki = sitelinks.nlwiki || sitelinks.enwiki;
    if (!nlWiki) {
      return void 0;
    }
    const site = sitelinks.nlwiki ? "nl.wikipedia.org" : "en.wikipedia.org";
    return `https://${site}/wiki/${encodeURIComponent(nlWiki.title)}`;
  }
  /**
   * Extract occupations from Wikidata claims
   */
  extractOccupations(claims) {
    if (!claims || claims.length === 0) {
      return void 0;
    }
    const occupationMap = {
      "Q36180": "schrijver",
      "Q482980": "auteur",
      "Q49757": "dichter",
      "Q28389": "scenarioschrijver",
      "Q6625963": "romanschrijver",
      "Q4853732": "kinderboekenschrijver",
      "Q333634": "vertaler",
      "Q12144794": "illustrator",
      "Q644687": "illustrator",
      "Q1028181": "schilder"
    };
    const occupations = claims.map((claim) => {
      const qid = claim?.mainsnak?.datavalue?.value?.id;
      return qid ? occupationMap[qid] || qid : null;
    }).filter((occ) => occ !== null);
    return occupations.length > 0 ? occupations : void 0;
  }
  /**
   * Extract notable works from Wikidata claims
   */
  extractNotableWorks(claims) {
    if (!claims || claims.length === 0) {
      return void 0;
    }
    const works = claims.map((claim) => claim?.mainsnak?.datavalue?.value?.id).filter((id) => id);
    return works.length > 0 ? works : void 0;
  }
  async fetchLinkedData(record) {
    if (!record.ppn) {
      console.log("[KB Plugin] No PPN for:", record.title);
      return;
    }
    if (record.linkedData) {
      console.log("[KB Plugin] Linked data already exists for:", record.title);
      return;
    }
    if (this.linkedDataCache.has(record.ppn)) {
      record.linkedData = this.linkedDataCache.get(record.ppn);
      console.log("[KB Plugin] Using cached linked data for:", record.title);
      return;
    }
    const url = `https://data.bibliotheken.nl/doc/nbt/${record.ppn}.json`;
    console.log("[KB Plugin] Fetching linked data from:", url);
    try {
      const response = await (0, import_obsidian2.requestUrl)({ url, method: "GET", throw: false });
      console.log("[KB Plugin] Linked data response status:", response.status);
      if (response.status !== 200 || !response.text) {
        console.log("[KB Plugin] No linked data available for:", record.title);
        return;
      }
      const payload = JSON.parse(response.text);
      const linkedData = this.parseLinkedDataPayload(payload);
      if (linkedData) {
        linkedData.uri = linkedData.uri || record.ppnUri;
        this.linkedDataCache.set(record.ppn, linkedData);
        record.linkedData = linkedData;
        console.log("[KB Plugin] Linked data enriched for:", record.title, linkedData);
      } else {
        console.log("[KB Plugin] Failed to parse linked data for:", record.title);
      }
    } catch (error) {
      console.error("[KB Plugin] Linked data enrichment failed:", error);
    }
  }
  parseLinkedDataPayload(payload) {
    if (!payload) {
      return void 0;
    }
    const graph = Array.isArray(payload["@graph"]) ? payload["@graph"] : [];
    if (graph.length === 0) {
      return void 0;
    }
    const index = /* @__PURE__ */ new Map();
    graph.forEach((node) => {
      if (node?.["@id"]) {
        index.set(node["@id"], node);
      }
    });
    const primaryNode = graph.find((node) => typeof node?.["@id"] === "string" && node["@id"].includes("/nbt/")) || graph[0];
    if (!primaryNode) {
      return void 0;
    }
    return {
      uri: primaryNode["@id"],
      creators: this.extractLinkedResources(primaryNode, index, ["schema:creator", "creator", "dc:creator"]),
      subjects: this.extractLinkedResources(primaryNode, index, ["schema:about", "subject", "dc:subject"]),
      series: this.extractLinkedResources(primaryNode, index, ["schema:isPartOf", "isPartOf", "dcterms:isPartOf"])
    };
  }
  extractLinkedResources(node, index, keys) {
    const resources = [];
    keys.forEach((key) => {
      const value = node?.[key];
      if (!value) {
        return;
      }
      const values = Array.isArray(value) ? value : [value];
      values.forEach((entry) => {
        const resource = this.toLinkedDataResource(entry, index);
        if (resource) {
          resources.push(resource);
        }
      });
    });
    return this.dedupeLinkedResources(resources);
  }
  toLinkedDataResource(entry, index) {
    if (typeof entry === "string") {
      return this.buildLinkedDataResource(entry, index.get(entry));
    }
    if (entry?.["@id"]) {
      const node = index.get(entry["@id"]) || entry;
      return this.buildLinkedDataResource(entry["@id"], node);
    }
    if (entry?.value) {
      return this.buildLinkedDataResource(entry.value, entry);
    }
    return void 0;
  }
  buildLinkedDataResource(uri, node) {
    const labelValue = node?.["skos:prefLabel"] || node?.["rdfs:label"] || node?.["schema:name"] || node?.label;
    const label = Array.isArray(labelValue) ? labelValue[0] : labelValue;
    const type = node?.["@type"];
    const resource = { uri };
    if (typeof label === "string") {
      resource.label = label;
    }
    if (type) {
      resource.type = type;
    }
    if (node) {
      const descValue = node?.["schema:description"] || node?.["rdfs:comment"] || node?.description;
      if (typeof descValue === "string") {
        resource.description = descValue;
      } else if (Array.isArray(descValue) && typeof descValue[0] === "string") {
        resource.description = descValue[0];
      }
      const imageValue = node?.["schema:image"] || node?.["foaf:depiction"] || node?.image;
      if (typeof imageValue === "string") {
        resource.image = imageValue;
      } else if (imageValue?.["@id"]) {
        resource.image = imageValue["@id"];
      }
      const birthValue = node?.["schema:birthDate"] || node?.birthDate;
      if (typeof birthValue === "string") {
        resource.birthDate = birthValue;
      }
      const deathValue = node?.["schema:deathDate"] || node?.deathDate;
      if (typeof deathValue === "string") {
        resource.deathDate = deathValue;
      }
      const sameAsValue = node?.["owl:sameAs"] || node?.["schema:sameAs"] || node?.sameAs;
      if (sameAsValue) {
        const sameAsArray = Array.isArray(sameAsValue) ? sameAsValue : [sameAsValue];
        resource.sameAs = sameAsArray.map((item) => typeof item === "string" ? item : item?.["@id"]).filter((item) => typeof item === "string");
      }
      const broaderValue = node?.["skos:broader"] || node?.broader;
      if (broaderValue) {
        const broaderArray = Array.isArray(broaderValue) ? broaderValue : [broaderValue];
        resource.broader = broaderArray.map((item) => typeof item === "string" ? item : item?.["@id"]).filter((item) => typeof item === "string");
      }
      const narrowerValue = node?.["skos:narrower"] || node?.narrower;
      if (narrowerValue) {
        const narrowerArray = Array.isArray(narrowerValue) ? narrowerValue : [narrowerValue];
        resource.narrower = narrowerArray.map((item) => typeof item === "string" ? item : item?.["@id"]).filter((item) => typeof item === "string");
      }
      const relatedValue = node?.["skos:related"] || node?.related;
      if (relatedValue) {
        const relatedArray = Array.isArray(relatedValue) ? relatedValue : [relatedValue];
        resource.related = relatedArray.map((item) => typeof item === "string" ? item : item?.["@id"]).filter((item) => typeof item === "string");
      }
    }
    return resource;
  }
  dedupeLinkedResources(resources) {
    const seen = /* @__PURE__ */ new Map();
    resources.forEach((resource) => {
      if (!seen.has(resource.uri)) {
        seen.set(resource.uri, resource);
      }
    });
    return Array.from(seen.values());
  }
  /**
   * Extract series information from relation field or title
   */
  extractSeries(dc) {
    const relations = this.extractMultipleFields(dc, "dc:relation");
    for (const relation of relations) {
      if (/serie|reeks|deel|volume/i.test(relation)) {
        return relation.trim();
      }
    }
    const isPartOf = this.extractField(dc, "dcterms:isPartOf") || this.extractField(dc, "dc:isPartOf");
    if (isPartOf) {
      return isPartOf.trim();
    }
    const title = this.extractField(dc, "dc:title");
    if (title) {
      const seriesMatch = title.match(/\(([^)]+(?:serie|reeks|deel)[^)]*)\)/i);
      if (seriesMatch) {
        return seriesMatch[1].trim();
      }
    }
    return void 0;
  }
  extractYear(dc) {
    const dateField = this.extractField(dc, "dc:date") || this.extractField(dc, "dcterms:issued");
    if (!dateField) return void 0;
    const match = dateField.match(/\d{4}/);
    return match ? match[0] : void 0;
  }
  /**
   * Download a cover image from a URL
   */
  async downloadCover(url) {
    try {
      console.log("[KB Plugin] Downloading cover from:", url);
      const response = await (0, import_obsidian2.requestUrl)({
        url,
        method: "GET",
        throw: false
      });
      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.arrayBuffer;
    } catch (error) {
      console.error("[KB Plugin] Error downloading cover:", error);
      return null;
    }
  }
  /**
   * Get cover URL from Google Books API
   */
  async getGoogleBooksCover(isbn) {
    try {
      console.log("[KB Plugin] Checking Google Books for ISBN:", isbn);
      const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
      const response = await (0, import_obsidian2.requestUrl)({
        url,
        method: "GET",
        throw: false
      });
      if (response.status !== 200) {
        return null;
      }
      const data = response.json;
      if (data.totalItems > 0 && data.items[0].volumeInfo.imageLinks) {
        const imageLinks = data.items[0].volumeInfo.imageLinks;
        const coverUrl = imageLinks.large || imageLinks.medium || imageLinks.thumbnail || imageLinks.smallThumbnail;
        if (coverUrl) {
          const httpsUrl = coverUrl.replace("http:", "https:");
          console.log("[KB Plugin] Found Google Books cover:", httpsUrl);
          return httpsUrl;
        }
      }
      return null;
    } catch (error) {
      console.error("[KB Plugin] Error fetching Google Books cover:", error);
      return null;
    }
  }
  /**
   * Get cover URL from Amazon (simple image URL approach)
   * Note: For full PA-API, credentials would be required
   */
  getAmazonCoverUrl(isbn, region = "nl") {
    const cleanIsbn = isbn.replace(/-/g, "");
    const imageServers = {
      "nl": "m.media-amazon.com",
      // Netherlands
      "de": "m.media-amazon.com",
      // Germany
      "uk": "m.media-amazon.com",
      // UK
      "us": "m.media-amazon.com",
      // US
      "fr": "m.media-amazon.com"
      // France
    };
    const server = imageServers[region] || imageServers["nl"];
    return `https://${server}/images/P/${cleanIsbn}.jpg`;
  }
  /**
   * Enrich metadata from Bol.com (if available)
   * Fetches additional metadata like series, better descriptions, etc.
   */
  async enrichFromBol(metadata) {
    if (!metadata.isbn) {
      return metadata;
    }
    try {
      const bolMetadata = await this.getBolMetadata(metadata.isbn);
      if (bolMetadata) {
        const enriched = {
          ...metadata,
          series: metadata.series || bolMetadata.series,
          description: metadata.description || bolMetadata.description,
          pageCount: metadata.pageCount || bolMetadata.pageCount,
          coverUrl: bolMetadata.coverUrl || metadata.coverUrl
        };
        if (!enriched.coverUrl && metadata.isbn) {
          enriched.coverUrl = `https://covers.openlibrary.org/b/isbn/${metadata.isbn}-L.jpg`;
          console.log("[KB Plugin] Using Open Library fallback cover for:", metadata.title);
        }
        return enriched;
      }
    } catch (error) {
      console.error("[KB Plugin] Error enriching from Bol.com:", error);
    }
    if (metadata.isbn) {
      metadata.coverUrl = `https://covers.openlibrary.org/b/isbn/${metadata.isbn}-L.jpg`;
      console.log("[KB Plugin] Bol enrichment failed, using Open Library for:", metadata.title);
    }
    return metadata;
  }
  /**
   * Get metadata from Bol.com product page
   */
  async getBolMetadata(isbn) {
    try {
      console.log("[KB Plugin] Fetching Bol.com metadata for ISBN:", isbn);
      const searchParams = new URLSearchParams({
        searchtext: isbn
      });
      const searchUrl = `https://www.bol.com/nl/nl/s/?${searchParams}`;
      const response = await (0, import_obsidian2.requestUrl)({
        url: searchUrl,
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "nl,en-US;q=0.7,en;q=0.3"
        },
        throw: false
      });
      if (response.status !== 200) {
        return null;
      }
      const productUrlMatch = response.text.match(/href="([^"]*\/p\/[^"]*\/[^"]*)"/);
      if (!productUrlMatch) {
        return null;
      }
      const productUrl = `https://www.bol.com${productUrlMatch[1]}`;
      console.log("[KB Plugin] Found Bol.com product URL:", productUrl);
      const productResponse = await (0, import_obsidian2.requestUrl)({
        url: productUrl,
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        },
        throw: false
      });
      if (productResponse.status !== 200) {
        return null;
      }
      const html = productResponse.text;
      const imageMatches = html.match(/https:\/\/media\.s-bol\.com\/[^"]*\.jpg[^"]*/g);
      const coverUrl = imageMatches?.find((url) => url.includes("550x550")) || imageMatches?.[0];
      let series;
      const seriesMatch = html.match(/Serie:\s*<\/dt>\s*<dd[^>]*>([^<]+)</i) || html.match(/Boekenreeks:\s*<\/dt>\s*<dd[^>]*>([^<]+)</i) || html.match(/"bookSeries":"([^"]+)"/);
      if (seriesMatch) {
        series = seriesMatch[1].trim();
      }
      let pageCount;
      const pageMatch = html.match(/(\d+)\s*pagina's?/i) || html.match(/Aantal pagina's:\s*<\/dt>\s*<dd[^>]*>(\d+)</i);
      if (pageMatch) {
        pageCount = pageMatch[1];
      }
      let description;
      const descMatch = html.match(/<div[^>]*class="[^"]*product-description[^"]*"[^>]*>([^<]+)</i) || html.match(/"description":"([^"]+)"/);
      if (descMatch) {
        description = descMatch[1].trim().replace(/\\n/g, " ").substring(0, 500);
      }
      return {
        coverUrl,
        series,
        pageCount,
        description
      };
    } catch (error) {
      console.error("[KB Plugin] Error fetching Bol.com metadata:", error);
      return null;
    }
  }
  /**
   * Get cover URL from Bol.com (Dutch bookstore)
   * Scrapes the product page to find the cover image URL
   */
  async getBolCoverUrl(isbn) {
    try {
      console.log("[KB Plugin] Checking Bol.com for ISBN:", isbn);
      const searchParams = new URLSearchParams({
        searchtext: isbn
      });
      const searchUrl = `https://www.bol.com/nl/nl/s/?${searchParams}`;
      const response = await (0, import_obsidian2.requestUrl)({
        url: searchUrl,
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "nl,en-US;q=0.7,en;q=0.3",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1"
        },
        throw: false
      });
      if (response.status !== 200) {
        return null;
      }
      const productUrlMatch = response.text.match(/href="([^"]*\/p\/[^"]*\/[^"]*)"/);
      if (!productUrlMatch) {
        return null;
      }
      const productUrl = `https://www.bol.com${productUrlMatch[1]}`;
      console.log("[KB Plugin] Found Bol.com product URL:", productUrl);
      const productResponse = await (0, import_obsidian2.requestUrl)({
        url: productUrl,
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "nl,en-US;q=0.7,en;q=0.3",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1"
        },
        throw: false
      });
      if (productResponse.status !== 200) {
        return null;
      }
      const imageMatches = productResponse.text.match(/https:\/\/media\.s-bol\.com\/[^"]*\.jpg[^"]*/g);
      if (imageMatches && imageMatches.length > 0) {
        const highQualityMatch = imageMatches.find((url) => url.includes("550x550"));
        const coverUrl = highQualityMatch || imageMatches[0];
        console.log("[KB Plugin] Found Bol.com cover:", coverUrl);
        return coverUrl;
      }
      return null;
    } catch (error) {
      console.error("[KB Plugin] Error fetching Bol.com cover:", error);
      return null;
    }
  }
  /**
   * Search for books in a series on Bol.com
   * Returns ISBNs of books found in the series
   */
  async searchBolSeries(seriesName, maxBooks = 20) {
    try {
      console.log("[KB Plugin] Searching Bol.com for series:", seriesName);
      const searchParams = new URLSearchParams({
        searchtext: `"${seriesName}"`
      });
      const searchUrl = `https://www.bol.com/nl/nl/s/?${searchParams}`;
      const response = await (0, import_obsidian2.requestUrl)({
        url: searchUrl,
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "nl,en-US;q=0.7,en;q=0.3"
        },
        throw: false
      });
      if (response.status !== 200) {
        return [];
      }
      const productUrls = [];
      const urlMatches = response.text.match(/href="([^"]*\/p\/[^"]*\/[^"]*)"/g);
      if (urlMatches) {
        const uniqueUrls = /* @__PURE__ */ new Set();
        for (const match of urlMatches) {
          const urlMatch = match.match(/href="([^"]*\/p\/[^"]*\/[^"]*)"/);
          if (urlMatch) {
            const url = urlMatch[1].startsWith("http") ? urlMatch[1] : `https://www.bol.com${urlMatch[1]}`;
            uniqueUrls.add(url);
          }
        }
        productUrls.push(...Array.from(uniqueUrls).slice(0, maxBooks));
      }
      console.log(`[KB Plugin] Found ${productUrls.length} products for series "${seriesName}"`);
      const isbns = [];
      for (const productUrl of productUrls) {
        try {
          const productResponse = await (0, import_obsidian2.requestUrl)({
            url: productUrl,
            method: "GET",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            },
            throw: false
          });
          if (productResponse.status === 200) {
            const isbnMatch = productResponse.text.match(/978\d{10}/);
            if (isbnMatch && !isbns.includes(isbnMatch[0])) {
              isbns.push(isbnMatch[0]);
              console.log(`[KB Plugin] Found ISBN: ${isbnMatch[0]}`);
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 1e3));
        } catch (error) {
          console.error(`[KB Plugin] Error fetching product ${productUrl}:`, error);
        }
      }
      console.log(`[KB Plugin] Extracted ${isbns.length} ISBNs from series "${seriesName}"`);
      return isbns;
    } catch (error) {
      console.error("[KB Plugin] Error searching Bol.com series:", error);
      return [];
    }
  }
  /**
   * Detect and improve cover quality by checking image size
   */
  async detectCoverQuality(url) {
    try {
      const response = await (0, import_obsidian2.requestUrl)({
        url,
        method: "HEAD",
        throw: false
      });
      if (response.status === 200) {
        const contentLength = response.headers["content-length"];
        if (contentLength) {
          const sizeKB = parseInt(contentLength) / 1024;
          console.log(`[KB Plugin] Cover size: ${sizeKB.toFixed(2)} KB`);
          if (sizeKB > 80) return 5;
          if (sizeKB > 50) return 4;
          if (sizeKB > 20) return 3;
          if (sizeKB > 5) return 2;
          return 1;
        }
      }
      return 0;
    } catch (error) {
      console.error("[KB Plugin] Error detecting cover quality:", error);
      return 0;
    }
  }
};

// src/template/engine.ts
var TemplateEngine = class {
  /**
   * Render a template with book metadata
   */
  render(template, metadata, additionalData = {}) {
    let result = template;
    const data = this.prepareData(metadata, additionalData);
    result = this.processConditionals(result, data);
    result = this.processLoops(result, data);
    result = this.processDateHelpers(result);
    result = this.replacePlaceholders(result, data);
    result = this.processInlineScripts(result, data);
    return result;
  }
  /**
   * Prepare data object from metadata
   */
  prepareData(metadata, additionalData) {
    const data = {
      ...additionalData,
      title: metadata.title || "",
      isbn: metadata.isbn || "",
      publisher: metadata.publisher || "",
      publishYear: metadata.publishYear || "",
      language: metadata.language || "",
      description: metadata.description || "",
      identifier: metadata.identifier || "",
      pageCount: metadata.pageCount || "",
      targetAge: metadata.targetAge || "",
      series: metadata.series || "",
      coverUrl: metadata.coverUrl || "",
      localCoverImage: metadata.localCoverImage || ""
    };
    if (metadata.authors && metadata.authors.length > 0) {
      data.authors = metadata.authors;
      data.authorsString = metadata.authors.join(", ");
      data.author = metadata.authors[0];
    } else {
      data.authors = [];
      data.authorsString = "";
      data.author = "";
    }
    if (metadata.subjects && metadata.subjects.length > 0) {
      data.subjects = metadata.subjects;
      data.subjectsString = metadata.subjects.join(", ");
    } else {
      data.subjects = [];
      data.subjectsString = "";
    }
    if (metadata.linkedData) {
      data.linkedData = metadata.linkedData;
      if (metadata.linkedData.uri) {
        data.linkedDataUri = metadata.linkedData.uri;
      }
      if (metadata.linkedData.creators && metadata.linkedData.creators.length > 0) {
        data.linkedCreators = metadata.linkedData.creators;
        data.linkedCreatorsString = metadata.linkedData.creators.map((c) => c.label || c.uri).join(", ");
        data.linkedCreator = metadata.linkedData.creators[0];
        data.linkedCreatorUri = metadata.linkedData.creators[0].uri;
        const creatorsWithWikidata = metadata.linkedData.creators.filter((c) => c.wikidataProfile);
        if (creatorsWithWikidata.length > 0) {
          data.wikidataProfiles = creatorsWithWikidata.map((c) => c.wikidataProfile);
          data.wikidataProfile = creatorsWithWikidata[0].wikidataProfile;
          const firstProfile = creatorsWithWikidata[0].wikidataProfile;
          data.authorWikipediaUrl = firstProfile.wikipediaUrl;
          data.authorWikidataId = firstProfile.id;
          data.authorDescription = firstProfile.description;
          data.authorImageUrl = firstProfile.imageUrl;
          data.authorBirthDate = firstProfile.birthDate;
          data.authorDeathDate = firstProfile.deathDate;
          data.authorOccupation = firstProfile.occupation?.join(", ");
          data.authorOccupations = firstProfile.occupation;
        }
      }
      if (metadata.linkedData.subjects && metadata.linkedData.subjects.length > 0) {
        data.linkedSubjects = metadata.linkedData.subjects;
        data.linkedSubjectsString = metadata.linkedData.subjects.map((s) => s.label || s.uri).join(", ");
      }
      if (metadata.linkedData.series && metadata.linkedData.series.length > 0) {
        data.linkedSeries = metadata.linkedData.series;
        data.linkedSeriesString = metadata.linkedData.series.map((s) => s.label || s.uri).join(", ");
        data.linkedSeriesUri = metadata.linkedData.series[0].uri;
      }
    }
    if (metadata.ppn) {
      data.ppn = metadata.ppn;
    }
    if (metadata.ppnUri) {
      data.ppnUri = metadata.ppnUri;
    }
    return data;
  }
  /**
   * Replace {{variable}} placeholders with values
   */
  replacePlaceholders(template, data) {
    let result = template;
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    result = result.replace(placeholderRegex, (match, key) => {
      const trimmedKey = key.trim();
      if (trimmedKey.includes("[")) {
        return this.handleArrayAccess(trimmedKey, data);
      }
      if (trimmedKey.includes(".")) {
        return this.handlePropertyAccess(trimmedKey, data);
      }
      const value = data[trimmedKey];
      if (value === void 0 || value === null) {
        return "";
      }
      if (Array.isArray(value)) {
        return value.join(", ");
      }
      return String(value);
    });
    return result;
  }
  /**
   * Handle array access like {{authors.[0]}}
   */
  handleArrayAccess(key, data) {
    const match = key.match(/^([^[]+)\[(\d+)\]$/);
    if (!match) return "";
    const [, arrayName, indexStr] = match;
    const index = parseInt(indexStr, 10);
    const array = data[arrayName.trim()];
    if (!Array.isArray(array) || index >= array.length) {
      return "";
    }
    return String(array[index]);
  }
  /**
   * Handle property access like {{authors.length}}
   */
  handlePropertyAccess(key, data) {
    const parts = key.split(".");
    let current = data;
    for (const part of parts) {
      if (current === void 0 || current === null) {
        return "";
      }
      current = current[part.trim()];
    }
    if (current === void 0 || current === null) {
      return "";
    }
    return String(current);
  }
  /**
   * Process date helpers like {{DATE:YYYY-MM-DD}}
   */
  processDateHelpers(template) {
    let result = template;
    const dateRegex = /\{\{DATE:([^}]+)\}\}/g;
    result = result.replace(dateRegex, (match, format) => {
      const now = /* @__PURE__ */ new Date();
      return this.formatDate(now, format.trim());
    });
    return result;
  }
  /**
   * Format a date according to a format string
   * Supports basic tokens: YYYY, MM, DD, HH, mm, ss
   */
  formatDate(date, format) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return format.replace("YYYY", String(year)).replace("YY", String(year).slice(-2)).replace("MM", month).replace("DD", day).replace("HH", hours).replace("mm", minutes).replace("ss", seconds);
  }
  /**
   * Process conditional blocks like {{#if variable}}...{{/if}}
   */
  processConditionals(template, data) {
    let result = template;
    const ifRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;
    result = result.replace(ifRegex, (match, condition, trueBlock, falseBlock) => {
      const value = this.evaluateCondition(condition.trim(), data);
      if (value) {
        return trueBlock || "";
      } else {
        return falseBlock || "";
      }
    });
    const unlessRegex = /\{\{#unless\s+([^}]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g;
    result = result.replace(unlessRegex, (match, condition, block) => {
      const value = this.evaluateCondition(condition.trim(), data);
      return !value ? block || "" : "";
    });
    return result;
  }
  /**
   * Process loop blocks like {{#each array}}...{{/each}}
   */
  processLoops(template, data) {
    let result = template;
    const eachRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    result = result.replace(eachRegex, (match, arrayName, block) => {
      const array = data[arrayName.trim()];
      if (!Array.isArray(array) || array.length === 0) {
        return "";
      }
      return array.map((item, index) => {
        let itemBlock = block;
        itemBlock = itemBlock.replace(/\{\{this\}\}/g, String(item));
        itemBlock = itemBlock.replace(/\{\{@index\}\}/g, String(index));
        itemBlock = itemBlock.replace(/\{\{@first\}\}/g, index === 0 ? "true" : "false");
        itemBlock = itemBlock.replace(/\{\{@last\}\}/g, index === array.length - 1 ? "true" : "false");
        return itemBlock;
      }).join("");
    });
    return result;
  }
  /**
   * Process inline script blocks like <%=%>
   */
  processInlineScripts(template, data) {
    let result = template;
    const scriptRegex = /<%=\s*([\s\S]*?)\s*%>/g;
    result = result.replace(scriptRegex, (match, script) => {
      try {
        const fn = new Function(...Object.keys(data), `return ${script};`);
        const output = fn(...Object.values(data));
        return output !== void 0 && output !== null ? String(output) : "";
      } catch (error) {
        console.error("[KB Plugin] Error executing inline script:", error);
        return `[Script Error: ${error instanceof Error ? error.message : String(error)}]`;
      }
    });
    return result;
  }
  /**
   * Evaluate a conditional expression
   */
  evaluateCondition(condition, data) {
    const value = this.getNestedValue(condition, data);
    if (value === void 0 || value === null || value === false) {
      return false;
    }
    if (typeof value === "string" && value.trim() === "") {
      return false;
    }
    if (typeof value === "number" && value === 0) {
      return false;
    }
    if (Array.isArray(value) && value.length === 0) {
      return false;
    }
    return true;
  }
  /**
   * Get nested value from data object (e.g., "authors.length")
   */
  getNestedValue(path, data) {
    const parts = path.split(".");
    let current = data;
    for (const part of parts) {
      if (current === void 0 || current === null) {
        return void 0;
      }
      current = current[part.trim()];
    }
    return current;
  }
  /**
   * Sanitize a string for use as a filename
   */
  sanitizeFilename(filename) {
    return filename.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim().substring(0, 200);
  }
  /**
   * Render a filename pattern
   */
  renderFilename(pattern, metadata, additionalData = {}) {
    const rendered = this.render(pattern, metadata, additionalData);
    return this.sanitizeFilename(rendered);
  }
};

// src/template/reader.ts
var import_obsidian3 = require("obsidian");
var TemplateReader = class {
  constructor(app) {
    this.app = app;
  }
  /**
   * Read a template file from the vault
   */
  async readTemplate(templatePath) {
    try {
      const file = this.app.vault.getAbstractFileByPath(templatePath);
      if (!file || !(file instanceof import_obsidian3.TFile)) {
        console.error("[KB Plugin] Template file not found:", templatePath);
        return null;
      }
      const content = await this.app.vault.read(file);
      return content;
    } catch (error) {
      console.error("[KB Plugin] Error reading template:", error);
      return null;
    }
  }
  /**
   * Check if a template file exists
   */
  async templateExists(templatePath) {
    const file = this.app.vault.getAbstractFileByPath(templatePath);
    return file instanceof import_obsidian3.TFile;
  }
  /**
   * Get the default template
   * Returns a hard-coded default if no template file is configured
   */
  getDefaultTemplate() {
    return `---
title: "{{title}}"
author: "{{author}}"
authors:
{{#if authors}}
{{#each authors}}
  - "{{this}}"
{{/each}}
{{else}}
  - "Unknown Author"
{{/if}}
isbn: "{{isbn}}"
publishYear: "{{publishYear}}"
publisher: "{{publisher}}"
language: "{{language}}"
subjects:
{{#if subjects}}
{{#each subjects}}
  - "{{this}}"
{{/each}}
{{/if}}
dateAdded: "{{DATE:YYYY-MM-DD}}"
status: "to-read"
rating: ""
{{#if localCoverImage}}
cover: "{{localCoverImage}}"
{{/if}}
{{#if pageCount}}
pageCount: "{{pageCount}}"
{{/if}}
{{#if targetAge}}
targetAge: "{{targetAge}}"
{{/if}}
{{#if series}}
series: "{{series}}"
{{/if}}
tags:
  - books
{{#if subjects}}
{{#each subjects}}
  - books/{{this}}
{{/each}}
{{/if}}
---

# {{title}}

{{#if localCoverImage}}
![[{{localCoverImage}}|200]]
{{/if}}

{{#if authors}}
**Authors:** {{authorsString}}
{{/if}}
{{#if publishYear}}
**Published:** {{publishYear}}
{{/if}}
{{#if publisher}}
**Publisher:** {{publisher}}
{{/if}}
{{#if isbn}}
**ISBN:** {{isbn}}
{{/if}}
{{#if language}}
**Language:** {{language}}
{{/if}}
{{#if targetAge}}
**Target Age:** {{targetAge}}
{{/if}}
{{#if pageCount}}
**Page Count:** {{pageCount}}
{{/if}}
{{#if series}}
**Series:** {{series}}
{{/if}}

{{#if wikidataProfile}}
## About the Author

{{#if authorImageUrl}}
![{{author}}]({{authorImageUrl}})

{{/if}}
**{{author}}**{{#if authorDescription}} \u2014 {{authorDescription}}{{/if}}

{{#if authorBirthDate}}
**Born:** {{authorBirthDate}}{{#if authorDeathDate}} | **Died:** {{authorDeathDate}}{{/if}}
{{/if}}
{{#if authorOccupation}}
**Occupation:** {{authorOccupation}}
{{/if}}
{{#if authorWikipediaUrl}}

\u{1F517} [View on Wikipedia]({{authorWikipediaUrl}})
{{/if}}

{{/if}}
## Description

{{#if description}}
{{description}}
{{else}}
No description available.
{{/if}}

## My Notes



## Reading Progress

- [ ] Started reading
- [ ] Finished reading
- [ ] Added rating
- [ ] Wrote review

---

*Book added via KB Nederlandse Kinderboeken plugin on {{DATE:YYYY-MM-DD}}*
`;
  }
};

// src/services/CoverDownloadService.ts
var import_obsidian4 = require("obsidian");
var CoverDownloadService = class {
  constructor(app, apiClient, templateEngine, settings) {
    this.app = app;
    this.apiClient = apiClient;
    this.templateEngine = templateEngine;
    this.settings = settings;
  }
  /**
   * Download and save cover image to vault with multi-source fallback.
   * Returns the local file path or fallback URL/null.
   *
   * @param metadata - Book metadata containing ISBN(s) and cover URL
   * @param options - Download options
   * @returns Local file path if successful, fallback URL, or null
   */
  async downloadAndSaveCover(metadata, options = {}) {
    const { showNotice = false, showSource = true } = options;
    if (!metadata.coverUrl && (!metadata.allIsbns || metadata.allIsbns.length === 0)) {
      console.log("[KB Plugin] No cover URL or ISBNs available");
      return this.getFallbackUrl();
    }
    try {
      const folder = this.settings.attachmentFolder;
      const fileName = this.templateEngine.renderFilename(
        this.settings.coverFilenamePattern,
        metadata
      );
      const filePath = `${folder}/${fileName}.jpg`;
      if (this.settings.deduplicateCovers) {
        const exists = await this.app.vault.adapter.exists(filePath);
        if (exists) {
          console.log(`[KB Plugin] Cover already exists: ${filePath}`);
          return filePath;
        }
      }
      const result = await this.downloadCoverWithFallback(metadata);
      if (!result) {
        console.log("[KB Plugin] No cover found from any source");
        if (showNotice) {
          new import_obsidian4.Notice("Could not find cover image", 3e3);
        }
        return this.getFallbackUrl();
      }
      const folderExists = await this.app.vault.adapter.exists(folder);
      if (!folderExists) {
        await this.app.vault.createFolder(folder);
      }
      await this.app.vault.adapter.writeBinary(filePath, result.data);
      console.log(`[KB Plugin] Cover image saved to ${filePath} (from ${result.source})`);
      if (showNotice && showSource && result.source) {
        new import_obsidian4.Notice(`Cover downloaded from ${result.source}`, 3e3);
      }
      return filePath;
    } catch (error) {
      console.error("[KB Plugin] Error downloading cover:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (showNotice) {
        new import_obsidian4.Notice(`Could not save cover image: ${errorMessage}`);
      }
      return this.getFallbackUrl();
    }
  }
  /**
   * Download cover with multi-source fallback strategy.
   * Tries: Open Library → Google Books → Amazon → Bol.com
   *
   * @param metadata - Book metadata with ISBNs
   * @returns Cover data and source, or null if all sources fail
   */
  async downloadCoverWithFallback(metadata) {
    const isbnsToTry = this.getIsbnsToTry(metadata);
    if (isbnsToTry.length === 0) {
      return null;
    }
    const sources = [
      { name: "Open Library", method: this.tryOpenLibrary.bind(this) },
      { name: "Google Books", method: this.tryGoogleBooks.bind(this) },
      { name: "Amazon", method: this.tryAmazon.bind(this) },
      { name: "Bol.com", method: this.tryBolCom.bind(this) }
    ];
    for (const source of sources) {
      console.log(`[KB Plugin] Trying ${source.name}...`);
      const result = await source.method(isbnsToTry);
      if (result) {
        console.log(`[KB Plugin] \u2705 Cover found from ${source.name} (ISBN: ${result.isbn}, ${result.data.byteLength} bytes)`);
        return { ...result, source: source.name };
      }
    }
    return null;
  }
  /**
   * Try downloading from Open Library for all ISBNs
   */
  async tryOpenLibrary(isbns) {
    for (const isbn of isbns) {
      const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
      const coverData = await this.apiClient.downloadCover(coverUrl);
      if (this.isValidCover(coverData)) {
        return { data: coverData, isbn };
      }
    }
    return null;
  }
  /**
   * Try downloading from Google Books for all ISBNs
   */
  async tryGoogleBooks(isbns) {
    for (const isbn of isbns) {
      const googleCoverUrl = await this.apiClient.getGoogleBooksCover(isbn);
      if (googleCoverUrl) {
        const coverData = await this.apiClient.downloadCover(googleCoverUrl);
        if (this.isValidCover(coverData)) {
          return { data: coverData, isbn };
        }
      }
    }
    return null;
  }
  /**
   * Try downloading from Amazon for all ISBNs
   */
  async tryAmazon(isbns) {
    for (const isbn of isbns) {
      const amazonCoverUrl = this.apiClient.getAmazonCoverUrl(isbn, this.settings.amazonRegion);
      const coverData = await this.apiClient.downloadCover(amazonCoverUrl);
      if (this.isValidCover(coverData)) {
        return { data: coverData, isbn };
      }
    }
    return null;
  }
  /**
   * Try downloading from Bol.com for all ISBNs
   */
  async tryBolCom(isbns) {
    for (const isbn of isbns) {
      const bolCoverUrl = await this.apiClient.getBolCoverUrl(isbn);
      if (bolCoverUrl) {
        const coverData = await this.apiClient.downloadCover(bolCoverUrl);
        if (this.isValidCover(coverData)) {
          return { data: coverData, isbn };
        }
      }
    }
    return null;
  }
  /**
   * Get list of ISBNs to try for cover download
   */
  getIsbnsToTry(metadata) {
    const isbns = metadata.allIsbns && metadata.allIsbns.length > 0 ? metadata.allIsbns : [metadata.isbn].filter(Boolean);
    return isbns;
  }
  /**
   * Check if cover data is valid (not a placeholder/error image)
   */
  isValidCover(coverData) {
    return coverData !== null && coverData.byteLength > 1e3;
  }
  /**
   * Get fallback cover URL from settings
   */
  getFallbackUrl() {
    return this.settings.coverFallbackUrl || null;
  }
  /**
   * Try to get a cover URL for display purposes (doesn't download).
   * Uses the same fallback strategy but returns URL instead of downloading.
   *
   * @param metadata - Book metadata with ISBNs
   * @returns Cover URL or null
   */
  async getCoverUrlWithFallback(metadata) {
    if (metadata.coverUrl) {
      return metadata.coverUrl;
    }
    const isbnsToTry = this.getIsbnsToTry(metadata);
    if (isbnsToTry.length === 0) {
      return this.getFallbackUrl();
    }
    for (const isbn of isbnsToTry) {
      const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
      const coverData = await this.apiClient.downloadCover(coverUrl);
      if (this.isValidCover(coverData)) {
        return coverUrl;
      }
    }
    for (const isbn of isbnsToTry) {
      const googleCoverUrl = await this.apiClient.getGoogleBooksCover(isbn);
      if (googleCoverUrl) {
        return googleCoverUrl;
      }
    }
    if (isbnsToTry.length > 0) {
      const amazonUrl = this.apiClient.getAmazonCoverUrl(isbnsToTry[0], this.settings.amazonRegion);
      return amazonUrl;
    }
    return this.getFallbackUrl();
  }
};

// src/services/BookNoteCreatorService.ts
var import_obsidian5 = require("obsidian");
var BookNoteCreatorService = class {
  constructor(app, templateEngine, templateReader, coverDownloadService, settings) {
    this.app = app;
    this.templateEngine = templateEngine;
    this.templateReader = templateReader;
    this.coverDownloadService = coverDownloadService;
    this.settings = settings;
  }
  /**
   * Create or update a book note from metadata
   *
   * @param metadata - Book metadata to create note from
   * @param options - Creation options
   * @returns Result of the creation operation
   */
  async createBookNote(metadata, options = {}) {
    const {
      openFile = true,
      runTemplater = true,
      showNotice = true,
      showCoverSource = false
    } = options;
    try {
      console.log("[KB Plugin] Creating note for:", metadata.title);
      if (this.settings.downloadCovers && metadata.coverUrl) {
        const coverPath = await this.coverDownloadService.downloadAndSaveCover(metadata, {
          showNotice: false,
          showSource: showCoverSource
        });
        if (coverPath) {
          metadata.localCoverImage = coverPath;
        }
      }
      const filename = this.templateEngine.renderFilename(
        this.settings.filenamePattern,
        metadata
      );
      const folderPath = this.settings.bookNotesFolder;
      await this.ensureFolderExists(folderPath);
      const filePath = `${folderPath}/${filename}.md`;
      const fileExists = await this.app.vault.adapter.exists(filePath);
      const templateContent = await this.getTemplateContent();
      const renderedContent = this.templateEngine.render(templateContent, metadata);
      let file = null;
      if (fileExists) {
        const abstractFile = this.app.vault.getAbstractFileByPath(filePath);
        if (abstractFile instanceof import_obsidian5.TFile) {
          console.log("[KB Plugin] Updating existing note:", filePath);
          await this.app.vault.modify(abstractFile, renderedContent);
          file = abstractFile;
        }
      } else {
        console.log("[KB Plugin] Creating new note:", filePath);
        file = await this.app.vault.create(filePath, renderedContent);
      }
      if (file && openFile) {
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file);
      }
      if (file && runTemplater) {
        await this.runTemplaterIfAvailable(file);
      }
      if (showNotice) {
        const action = fileExists ? "updated" : "created";
        new import_obsidian5.Notice(`Book note ${action}: ${filename}`);
      }
      return {
        file,
        wasCreated: !fileExists,
        filePath,
        filename
      };
    } catch (error) {
      console.error("[KB Plugin] Error creating book note:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (showNotice) {
        new import_obsidian5.Notice(`Error creating book note: ${errorMessage}`);
      }
      throw error;
    }
  }
  /**
   * Ensure a folder exists, creating it if necessary
   */
  async ensureFolderExists(folderPath) {
    const folderExists = await this.app.vault.adapter.exists(folderPath);
    if (!folderExists) {
      console.log("[KB Plugin] Creating folder:", folderPath);
      await this.app.vault.createFolder(folderPath);
    }
  }
  /**
   * Get template content from settings or use default
   */
  async getTemplateContent() {
    if (this.settings.useTemplate && this.settings.templatePath) {
      const customTemplate = await this.templateReader.readTemplate(
        this.settings.templatePath
      );
      return customTemplate || this.templateReader.getDefaultTemplate();
    } else {
      return this.templateReader.getDefaultTemplate();
    }
  }
  /**
   * Run Templater plugin if it's installed in the vault
   */
  async runTemplaterIfAvailable(file) {
    try {
      const templaterPlugin = this.app.plugins?.plugins?.["templater-obsidian"];
      if (templaterPlugin) {
        console.log("[KB Plugin] Templater plugin detected, running...");
        const templater = templaterPlugin.templater;
        if (templater && typeof templater.overwrite_file_templates === "function") {
          await templater.overwrite_file_templates(file);
          console.log("[KB Plugin] Templater processing complete");
        } else {
          console.log("[KB Plugin] Templater API not available");
        }
      } else {
        console.log("[KB Plugin] Templater plugin not installed");
      }
    } catch (error) {
      console.error("[KB Plugin] Error running Templater:", error);
    }
  }
};

// src/search/SearchSuggester.ts
var import_obsidian6 = require("obsidian");
var import_fast_xml_parser2 = __toESM(require_fxp());
var KB_SRU_BASE_URL2 = "https://jsru.kb.nl/sru/sru";
var KB_COLLECTION2 = "GGC";
var SearchSuggester = class {
  constructor() {
    this.recentSearches = [];
    this.MAX_RECENT = 10;
    this.STORAGE_KEY = "kb-recent-searches";
    this.CBK_CACHE_TTL = 5 * 60 * 1e3;
    // 5 minutes
    this.CBK_SEED_RECORDS = 15;
    // lightweight probe for suggestions
    this.cbkSuggestionCache = /* @__PURE__ */ new Map();
    // Popular queries to suggest when user has no history
    this.POPULAR_QUERIES = [
      "Julia Donaldson",
      "Gruffalo",
      "Little People Big Dreams",
      "Kikker",
      "Muizenhuis",
      "prentenboeken",
      "books for toddlers",
      "dutch picture books",
      "books about friendship",
      "series for early readers"
    ];
    this.loadRecentSearches();
    this.cbkParser = new import_fast_xml_parser2.XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseTagValue: false,
      trimValues: true
    });
  }
  /**
   * Get suggestions based on partial user input
   */
  async getSuggestions(partial, maxResults = 8) {
    if (!partial || partial.trim().length < 2) {
      return this.getRecentSuggestions(maxResults);
    }
    const normalized = partial.toLowerCase().trim();
    const suggestions = [];
    const cbkSuggestions = await this.fetchCbkSuggestions(normalized, maxResults + 4);
    suggestions.push(...cbkSuggestions);
    const queryType = this.detectQueryType(normalized);
    if (cbkSuggestions.length < maxResults) {
      if (queryType === "author" || queryType === "general") {
        suggestions.push(...this.suggestAuthors(normalized));
      }
      if (queryType === "series" || queryType === "general") {
        suggestions.push(...this.suggestSeries(normalized));
      }
      if (queryType === "subject" || queryType === "general") {
        suggestions.push(...this.suggestSubjects(normalized));
      }
    }
    suggestions.push(...this.suggestFromRecent(normalized));
    if (cbkSuggestions.length === 0) {
      suggestions.push(...this.suggestFromPopular(normalized));
    }
    return this.rankAndDedupe(suggestions, normalized).slice(0, maxResults);
  }
  /**
   * Save a search to recent history
   */
  saveSearch(query) {
    if (!query || query.trim().length < 2) return;
    const trimmed = query.trim();
    this.recentSearches = this.recentSearches.filter((q) => q !== trimmed);
    this.recentSearches.unshift(trimmed);
    if (this.recentSearches.length > this.MAX_RECENT) {
      this.recentSearches = this.recentSearches.slice(0, this.MAX_RECENT);
    }
    this.persistRecentSearches();
  }
  /**
   * Clear recent search history
   */
  clearRecentSearches() {
    this.recentSearches = [];
    this.persistRecentSearches();
  }
  /**
   * Detect what type of query the user is typing
   */
  detectQueryType(query) {
    if (/\b(by|door|author|schrijver)\b/.test(query)) {
      return "author";
    }
    if (/\b(series|reeks)\b/.test(query)) {
      return "series";
    }
    if (/\b(about|over|subject|onderwerp)\b/.test(query)) {
      return "subject";
    }
    if (/^[A-Z]/.test(query)) {
      return "general";
    }
    return "general";
  }
  /**
   * Suggest authors from vocabulary
   */
  suggestAuthors(partial) {
    const suggestions = [];
    const matches = vocabulary.matchCreators(partial);
    matches.forEach((match) => {
      const score = this.calculateMatchScore(partial, match.canonical);
      suggestions.push({
        type: "author",
        text: `Books by ${match.canonical}`,
        matchScore: score,
        metadata: {
          description: `Search for books by ${match.canonical}`
        }
      });
    });
    return suggestions;
  }
  /**
   * Suggest series from vocabulary
   */
  suggestSeries(partial) {
    const suggestions = [];
    const matches = vocabulary.matchSeries(partial);
    matches.forEach((match) => {
      const score = this.calculateMatchScore(partial, match.canonical);
      suggestions.push({
        type: "series",
        text: `${match.canonical} series`,
        matchScore: score,
        metadata: {
          description: `Browse the ${match.canonical} series`
        }
      });
    });
    return suggestions;
  }
  /**
   * Suggest subjects from vocabulary
   */
  suggestSubjects(partial) {
    const suggestions = [];
    const matches = vocabulary.matchSubjects(partial);
    matches.forEach((match) => {
      const score = this.calculateMatchScore(partial, match.canonical);
      suggestions.push({
        type: "subject",
        text: `Books about ${match.canonical.toLowerCase()}`,
        matchScore: score,
        metadata: {
          description: `Find books about ${match.canonical.toLowerCase()}`
        }
      });
    });
    return suggestions;
  }
  /**
   * Suggest from recent searches
   */
  suggestFromRecent(partial) {
    const suggestions = [];
    this.recentSearches.forEach((recent) => {
      if (recent.toLowerCase().includes(partial)) {
        const score = this.calculateMatchScore(partial, recent);
        suggestions.push({
          type: "recent",
          text: recent,
          matchScore: score,
          metadata: {
            description: "Recent search"
          }
        });
      }
    });
    return suggestions;
  }
  /**
   * Suggest from popular queries
   */
  suggestFromPopular(partial) {
    const suggestions = [];
    this.POPULAR_QUERIES.forEach((popular) => {
      if (popular.toLowerCase().includes(partial)) {
        const score = this.calculateMatchScore(partial, popular);
        suggestions.push({
          type: "popular",
          text: popular,
          matchScore: score * 0.8,
          // Slightly lower priority than other types
          metadata: {
            description: "Popular search"
          }
        });
      }
    });
    return suggestions;
  }
  /**
   * Get recent searches as suggestions (for empty query)
   */
  getRecentSuggestions(limit) {
    const suggestions = [];
    this.recentSearches.slice(0, limit).forEach((recent) => {
      suggestions.push({
        type: "recent",
        text: recent,
        matchScore: 1,
        metadata: {
          description: "Recent search"
        }
      });
    });
    if (suggestions.length < limit) {
      const remaining = limit - suggestions.length;
      this.POPULAR_QUERIES.slice(0, remaining).forEach((popular) => {
        suggestions.push({
          type: "popular",
          text: popular,
          matchScore: 0.8,
          metadata: {
            description: "Popular search"
          }
        });
      });
    }
    return suggestions;
  }
  /**
   * Fetch live suggestions from the KB CBK (Centraal Bestand Kinderboeken) database
   */
  async fetchCbkSuggestions(partial, maxResults) {
    const cached = this.cbkSuggestionCache.get(partial);
    if (cached && Date.now() - cached.timestamp < this.CBK_CACHE_TTL) {
      return cached.suggestions;
    }
    try {
      const clause = `cql.serverChoice all "${this.escapeCql(partial)}"`;
      const url = `${KB_SRU_BASE_URL2}?x-collection=${KB_COLLECTION2}&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(clause)}&startRecord=1&maximumRecords=${this.CBK_SEED_RECORDS}&recordSchema=dc&x-fields=dc:title,dc:creator,dc:subject,dc:relation,dcterms:isPartOf`;
      const response = await (0, import_obsidian6.requestUrl)({
        url,
        method: "GET",
        headers: {
          "Accept": "application/xml, text/xml, */*",
          "User-Agent": "ObsidianKBPlugin/0.1.3"
        },
        throw: false
      });
      if (response.status !== 200 || !response.text) {
        return [];
      }
      const parsed = this.cbkParser.parse(response.text);
      const records = this.extractRecordsFromCbk(parsed);
      if (records.length === 0) {
        return [];
      }
      const authorCounts = /* @__PURE__ */ new Map();
      const subjectCounts = /* @__PURE__ */ new Map();
      const seriesCounts = /* @__PURE__ */ new Map();
      const titleCounts = /* @__PURE__ */ new Map();
      records.forEach((record) => {
        const dc = record["srw:recordData"] || record["recordData"] || {};
        this.extractFieldArray(dc, "dc:title").forEach((title) => {
          this.bumpCountIfMatch(titleCounts, title, partial);
        });
        this.extractFieldArray(dc, "dc:creator").forEach((author) => {
          this.bumpCountIfMatch(authorCounts, author, partial);
        });
        this.extractFieldArray(dc, "dc:subject").forEach((subject) => {
          this.bumpCountIfMatch(subjectCounts, subject, partial);
        });
        const seriesCandidates = [
          ...this.extractFieldArray(dc, "dc:relation"),
          ...this.extractFieldArray(dc, "dcterms:isPartOf")
        ];
        seriesCandidates.forEach((series) => {
          this.bumpCountIfMatch(seriesCounts, series, partial);
        });
      });
      const suggestions = [
        ...this.buildSuggestionsFromCounts(authorCounts, "author", partial, "Auteur uit CBK", 4),
        ...this.buildSuggestionsFromCounts(seriesCounts, "series", partial, "Serie uit CBK", 3),
        ...this.buildSuggestionsFromCounts(subjectCounts, "subject", partial, "Onderwerp uit CBK", 3),
        ...this.buildSuggestionsFromCounts(titleCounts, "title", partial, "Titel uit CBK", 4)
      ];
      const ranked = this.rankAndDedupe(suggestions, partial).slice(0, maxResults);
      this.cbkSuggestionCache.set(partial, { suggestions: ranked, timestamp: Date.now() });
      return ranked;
    } catch (error) {
      console.error("[KB Plugin] CBK suggestion fetch failed:", error);
      return [];
    }
  }
  /**
   * Increment map counts when the value matches the current partial input
   */
  bumpCountIfMatch(map, value, partial) {
    const normalizedValue = this.normalizeWhitespace(value);
    if (!normalizedValue || !this.matchesPartial(normalizedValue, partial)) {
      return;
    }
    map.set(normalizedValue, (map.get(normalizedValue) || 0) + 1);
  }
  matchesPartial(value, normalizedPartial) {
    return value.toLowerCase().includes(normalizedPartial);
  }
  /**
   * Convert frequency maps to Suggestion objects with CBK context
   */
  buildSuggestionsFromCounts(counts, type, partial, descriptionPrefix, limit) {
    return Array.from(counts.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return b[0].length - a[0].length;
    }).slice(0, limit).map(([value, count]) => {
      const baseScore = this.calculateMatchScore(partial, value);
      const boostedScore = Math.min(1, baseScore + Math.min(count, 5) * 0.05);
      return {
        type,
        text: value,
        matchScore: boostedScore,
        metadata: {
          count,
          description: `${descriptionPrefix} \xB7 ${count} hit${count === 1 ? "" : "s"} in CBK`
        }
      };
    });
  }
  extractFieldArray(dc, fieldName) {
    const field = dc?.[fieldName];
    if (!field) return [];
    if (Array.isArray(field)) {
      return field.map((entry) => typeof entry === "string" ? entry : entry?.["#text"]).filter((v) => !!v).map((v) => this.normalizeWhitespace(v));
    }
    const value = typeof field === "string" ? field : field?.["#text"];
    return value ? [this.normalizeWhitespace(value)] : [];
  }
  extractRecordsFromCbk(parsed) {
    const response = parsed?.["srw:searchRetrieveResponse"];
    const records = response?.["srw:records"]?.["srw:record"];
    if (!records) return [];
    return Array.isArray(records) ? records : [records];
  }
  normalizeWhitespace(value) {
    return value.replace(/\s+/g, " ").trim();
  }
  escapeCql(value) {
    return value.replace(/[()]/g, "\\$&");
  }
  /**
   * Calculate match score between partial input and suggestion
   * Higher score = better match
   */
  calculateMatchScore(partial, suggestion) {
    const partialLower = partial.toLowerCase();
    const suggestionLower = suggestion.toLowerCase();
    if (partialLower === suggestionLower) {
      return 1;
    }
    if (suggestionLower.startsWith(partialLower)) {
      return 0.9;
    }
    const words = suggestionLower.split(/\s+/);
    for (const word of words) {
      if (word.startsWith(partialLower)) {
        return 0.8;
      }
    }
    if (suggestionLower.includes(partialLower)) {
      return 0.6;
    }
    let matchedChars = 0;
    let suggestionIndex = 0;
    for (const char of partialLower) {
      const foundIndex = suggestionLower.indexOf(char, suggestionIndex);
      if (foundIndex !== -1) {
        matchedChars++;
        suggestionIndex = foundIndex + 1;
      }
    }
    if (matchedChars === partialLower.length) {
      return 0.4;
    }
    return 0;
  }
  /**
   * Rank suggestions by score and deduplicate
   */
  rankAndDedupe(suggestions, partial) {
    const deduped = /* @__PURE__ */ new Map();
    suggestions.forEach((suggestion) => {
      const existing = deduped.get(suggestion.text);
      if (!existing || suggestion.matchScore > existing.matchScore) {
        deduped.set(suggestion.text, suggestion);
      }
    });
    const ranked = Array.from(deduped.values()).sort((a, b) => {
      if (Math.abs(a.matchScore - b.matchScore) > 0.01) {
        return b.matchScore - a.matchScore;
      }
      const typePriority = { author: 5, series: 4, title: 4, subject: 3, recent: 2, popular: 1 };
      const aPriority = typePriority[a.type] || 0;
      const bPriority = typePriority[b.type] || 0;
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      return a.text.length - b.text.length;
    });
    return ranked;
  }
  /**
   * Load recent searches from localStorage
   */
  loadRecentSearches() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.recentSearches = JSON.parse(stored);
      }
    } catch (error) {
      console.error("[KB Plugin] Error loading recent searches:", error);
      this.recentSearches = [];
    }
  }
  /**
   * Persist recent searches to localStorage
   */
  persistRecentSearches() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.recentSearches));
    } catch (error) {
      console.error("[KB Plugin] Error saving recent searches:", error);
    }
  }
};

// src/components/SearchSuggestionsUI.ts
var SearchSuggestionsUI = class {
  constructor(containerEl, onSelect) {
    this.suggestionsEl = null;
    this.selectedIndex = -1;
    this.suggestions = [];
    this.containerEl = containerEl;
    this.onSelect = onSelect;
  }
  /**
   * Show suggestions dropdown
   */
  show(suggestions) {
    this.suggestions = suggestions;
    this.selectedIndex = -1;
    if (suggestions.length === 0) {
      this.hide();
      return;
    }
    if (!this.suggestionsEl) {
      this.suggestionsEl = this.containerEl.createDiv("kb-search-suggestions");
    }
    this.suggestionsEl.empty();
    this.suggestionsEl.addClass("kb-search-suggestions-visible");
    suggestions.forEach((suggestion, index) => {
      const item = this.suggestionsEl.createDiv("kb-suggestion-item");
      const icon = item.createSpan("kb-suggestion-icon");
      icon.textContent = this.getIconForType(suggestion.type);
      const text = item.createDiv("kb-suggestion-text");
      text.textContent = suggestion.text;
      if (suggestion.metadata?.description) {
        const desc = item.createDiv("kb-suggestion-description");
        desc.textContent = suggestion.metadata.description;
      }
      item.addEventListener("click", () => {
        this.onSelect(suggestion);
        this.hide();
      });
      item.addEventListener("mouseenter", () => {
        this.setSelected(index);
      });
    });
  }
  /**
   * Hide suggestions dropdown
   */
  hide() {
    if (this.suggestionsEl) {
      this.suggestionsEl.removeClass("kb-search-suggestions-visible");
    }
    this.selectedIndex = -1;
  }
  /**
   * Navigate suggestions with keyboard
   */
  navigateUp() {
    if (this.suggestions.length === 0) return false;
    this.selectedIndex--;
    if (this.selectedIndex < 0) {
      this.selectedIndex = this.suggestions.length - 1;
    }
    this.updateSelection();
    return true;
  }
  navigateDown() {
    if (this.suggestions.length === 0) return false;
    this.selectedIndex++;
    if (this.selectedIndex >= this.suggestions.length) {
      this.selectedIndex = 0;
    }
    this.updateSelection();
    return true;
  }
  /**
   * Select current suggestion
   */
  selectCurrent() {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.suggestions.length) {
      this.onSelect(this.suggestions[this.selectedIndex]);
      this.hide();
      return true;
    }
    return false;
  }
  /**
   * Get the currently selected suggestion (for autocomplete)
   */
  getCurrentSuggestion() {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.suggestions.length) {
      return this.suggestions[this.selectedIndex];
    }
    return null;
  }
  /**
   * Check if suggestions are visible
   */
  isVisible() {
    return this.suggestionsEl?.hasClass("kb-search-suggestions-visible") || false;
  }
  /**
   * Update visual selection
   */
  updateSelection() {
    if (!this.suggestionsEl) return;
    const items = this.suggestionsEl.querySelectorAll(".kb-suggestion-item");
    items.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.addClass("kb-suggestion-selected");
        item.scrollIntoView({ block: "nearest" });
      } else {
        item.removeClass("kb-suggestion-selected");
      }
    });
  }
  /**
   * Set selected index
   */
  setSelected(index) {
    this.selectedIndex = index;
    this.updateSelection();
  }
  /**
   * Get icon for suggestion type
   */
  getIconForType(type) {
    switch (type) {
      case "author":
        return "\u{1F464}";
      case "series":
        return "\u{1F4DA}";
      case "subject":
        return "\u{1F3F7}\uFE0F";
      case "title":
        return "\u{1F4D6}";
      case "recent":
        return "\u{1F550}";
      case "popular":
        return "\u2B50";
      default:
        return "\u{1F50D}";
    }
  }
  /**
   * Cleanup
   */
  destroy() {
    if (this.suggestionsEl) {
      this.suggestionsEl.remove();
      this.suggestionsEl = null;
    }
  }
};

// src/modal.ts
var BookSearchModal = class extends import_obsidian7.Modal {
  constructor(app, plugin, initialQuery = "") {
    super(app);
    this.results = [];
    this.selectedBook = null;
    this.suggestionsUI = null;
    this.debounceTimer = null;
    this.plugin = plugin;
    this.apiClient = new KBApiClient(
      plugin.settings.prioritizeChildrensBooks,
      plugin.settings.useFuzzySearch,
      plugin.settings.enableLinkedDataEnrichment,
      plugin.settings.enableWikidataEnrichment
    );
    this.templateEngine = new TemplateEngine();
    this.templateReader = new TemplateReader(app);
    this.coverDownloadService = new CoverDownloadService(
      app,
      this.apiClient,
      this.templateEngine,
      plugin.settings
    );
    this.bookNoteCreatorService = new BookNoteCreatorService(
      app,
      this.templateEngine,
      this.templateReader,
      this.coverDownloadService,
      plugin.settings
    );
    this.initialQuery = initialQuery;
    this.suggester = new SearchSuggester();
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("kb-kinderboeken-modal");
    contentEl.createEl("h2", { text: "Search KB Kinderboeken" });
    const searchTypeContainer = contentEl.createDiv("kb-search-type");
    let searchType = "general";
    new import_obsidian7.Setting(searchTypeContainer).setName("Search by").addDropdown(
      (dropdown) => dropdown.addOption("general", "Title/Author").addOption("isbn", "ISBN").setValue("general").onChange((value) => {
        searchType = value;
        searchInput.setPlaceholder(
          searchType === "isbn" ? "Enter ISBN (e.g., 9780123456789)" : "Enter book title or author name"
        );
      })
    );
    const searchContainer = contentEl.createDiv("kb-search-container");
    searchContainer.style.position = "relative";
    let searchInput;
    const performSearch = async () => {
      const query = searchInput.getValue().trim();
      if (!query) {
        new import_obsidian7.Notice("Please enter a search query");
        return;
      }
      if (this.suggestionsUI) {
        this.suggestionsUI.hide();
      }
      this.suggester.saveSearch(query);
      resultsContainer.empty();
      resultsContainer.createEl("p", { text: "Searching..." });
      if (searchType === "isbn") {
        await this.searchByISBN(query, resultsContainer);
      } else {
        await this.searchByQuery(query, resultsContainer);
      }
    };
    this.suggestionsUI = new SearchSuggestionsUI(
      searchContainer,
      (suggestion) => {
        searchInput.setValue(suggestion.text);
        this.suggestionsUI?.hide();
        performSearch();
      }
    );
    new import_obsidian7.Setting(searchContainer).setName("Search").addText((text) => {
      searchInput = text;
      text.setPlaceholder("Enter book title or author name").setValue(this.initialQuery).onChange(async (value) => {
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }
        if (searchType === "isbn") {
          this.suggestionsUI?.hide();
          return;
        }
        this.debounceTimer = setTimeout(async () => {
          if (value.trim().length >= 2) {
            const suggestions = await this.suggester.getSuggestions(value);
            this.suggestionsUI?.show(suggestions);
          } else if (value.trim().length === 0) {
            const suggestions = await this.suggester.getSuggestions("");
            this.suggestionsUI?.show(suggestions);
          } else {
            this.suggestionsUI?.hide();
          }
        }, 300);
      });
      text.inputEl.addEventListener("keydown", async (event) => {
        if (this.suggestionsUI?.isVisible()) {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            this.suggestionsUI.navigateDown();
            return;
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            this.suggestionsUI.navigateUp();
            return;
          } else if (event.key === "Escape") {
            event.preventDefault();
            this.suggestionsUI.hide();
            return;
          } else if (event.key === "Enter") {
            if (this.suggestionsUI.selectCurrent()) {
              event.preventDefault();
              return;
            }
          }
        }
        if (event.key === "Enter") {
          event.preventDefault();
          await performSearch();
        }
      });
      text.inputEl.addEventListener("blur", () => {
        setTimeout(() => {
          this.suggestionsUI?.hide();
        }, 200);
      });
      text.inputEl.addEventListener("focus", async () => {
        const value = searchInput.getValue();
        if (value.trim().length >= 2 && searchType !== "isbn") {
          const suggestions = await this.suggester.getSuggestions(value);
          this.suggestionsUI?.show(suggestions);
        } else if (value.trim().length === 0 && searchType !== "isbn") {
          const suggestions = await this.suggester.getSuggestions("");
          this.suggestionsUI?.show(suggestions);
        }
      });
    }).addButton(
      (button) => button.setButtonText("Search").onClick(async () => {
        await performSearch();
      })
    );
    const resultsContainer = contentEl.createDiv("kb-results-container");
    resultsContainer.createEl("p", {
      text: "Enter a search query and click Search",
      cls: "kb-results-hint"
    });
    setTimeout(() => {
      if (searchInput && searchInput.inputEl) {
        searchInput.inputEl.focus();
        searchInput.inputEl.select();
      }
    }, 50);
    if (this.initialQuery) {
      setTimeout(() => {
        searchInput.inputEl.dispatchEvent(new Event("change"));
        this.searchByQuery(this.initialQuery, resultsContainer);
      }, 100);
    }
  }
  async searchByQuery(query, container) {
    try {
      console.log("[KB Plugin] Modal: Searching by query:", query);
      this.results = await this.apiClient.searchBooks(query, 20);
      console.log("[KB Plugin] Modal: Found", this.results.length, "results");
      if (this.plugin.settings.enrichFromBol && this.results.length > 0) {
        console.log("[KB Plugin] Modal: Enriching results from Bol.com...");
        const enrichedResults = await Promise.all(
          this.results.map(async (book) => {
            try {
              return await this.apiClient.enrichFromBol(book);
            } catch (error) {
              console.error("[KB Plugin] Error enriching book:", error);
              return book;
            }
          })
        );
        this.results = enrichedResults;
      }
      this.displayResults(container);
    } catch (error) {
      console.error("[KB Plugin] Modal: Search error:", error);
      container.empty();
      container.createEl("p", {
        text: "An error occurred while searching. Please try again.",
        cls: "kb-no-results"
      });
    }
  }
  async searchByISBN(isbn, container) {
    try {
      console.log("[KB Plugin] Modal: Searching by ISBN:", isbn);
      const result = await this.apiClient.searchByISBN(isbn);
      this.results = result ? [result] : [];
      console.log("[KB Plugin] Modal: ISBN search result:", result ? "found" : "not found");
      this.displayResults(container);
    } catch (error) {
      console.error("[KB Plugin] Modal: ISBN search error:", error);
      container.empty();
      container.createEl("p", {
        text: "An error occurred while searching. Please try again.",
        cls: "kb-no-results"
      });
    }
  }
  displayResults(container) {
    container.empty();
    if (this.results.length === 0) {
      container.createEl("p", { text: "No results found", cls: "kb-no-results" });
      return;
    }
    container.createEl("p", {
      text: `Found ${this.results.length} result(s)`,
      cls: "kb-results-count"
    });
    const resultsList = container.createDiv("kb-results-list");
    this.results.forEach((book) => {
      const bookEl = resultsList.createDiv("kb-book-result");
      const coverContainer = bookEl.createDiv("kb-book-cover");
      if (book.coverUrl) {
        this.loadCoverWithFallback(coverContainer, book);
      } else {
        this.addCoverPlaceholder(coverContainer);
      }
      const bookInfo = bookEl.createDiv("kb-book-info");
      bookInfo.createEl("h3", { text: book.title });
      if (book.authors && book.authors.length > 0) {
        bookInfo.createEl("p", {
          text: `Author(s): ${book.authors.join(", ")}`,
          cls: "kb-book-authors"
        });
      }
      const details = [];
      if (book.isbn) details.push(`ISBN: ${book.isbn}`);
      if (book.publishYear) details.push(`Year: ${book.publishYear}`);
      if (book.publisher) details.push(`Publisher: ${book.publisher}`);
      if (details.length > 0) {
        bookInfo.createEl("p", {
          text: details.join(" | "),
          cls: "kb-book-details"
        });
      }
      if (book.description) {
        const desc = book.description.substring(0, 200);
        bookInfo.createEl("p", {
          text: desc + (book.description.length > 200 ? "..." : ""),
          cls: "kb-book-description"
        });
      }
      const selectBtn = bookEl.createEl("button", {
        text: "Insert",
        cls: "kb-select-button"
      });
      selectBtn.onclick = async () => {
        try {
          this.selectedBook = book;
          await this.insertBookMetadata();
          this.close();
        } catch (error) {
          console.error("[KB Plugin] Error inserting metadata:", error);
          new import_obsidian7.Notice("Failed to insert metadata. Check console for details.");
        }
      };
    });
  }
  async insertBookMetadata() {
    if (!this.selectedBook) {
      console.error("[KB Plugin] No book selected");
      return;
    }
    try {
      await this.bookNoteCreatorService.createBookNote(this.selectedBook, {
        openFile: true,
        runTemplater: true,
        showNotice: true,
        showCoverSource: true
      });
    } catch (error) {
      console.error("[KB Plugin] Error creating book note:", error);
    }
  }
  /**
   * Load cover with fallback to alternative ISBNs if primary fails
   */
  async loadCoverWithFallback(container, book) {
    const isbnsToTry = book.allIsbns && book.allIsbns.length > 0 ? book.allIsbns : [book.isbn].filter(Boolean);
    if (isbnsToTry.length === 0) {
      this.addCoverPlaceholder(container);
      return;
    }
    let currentIndex = 0;
    let triedOpenLibrary = false;
    let triedGoogleBooks = false;
    const tryNextSource = async () => {
      if (!triedOpenLibrary) {
        if (currentIndex >= isbnsToTry.length) {
          triedOpenLibrary = true;
          currentIndex = 0;
          await tryNextSource();
          return;
        }
        const isbn = isbnsToTry[currentIndex];
        const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
        const coverImg = container.createEl("img", {
          attr: {
            src: coverUrl,
            alt: `Cover for ${book.title}`,
            loading: "lazy"
          }
        });
        coverImg.onerror = () => {
          coverImg.remove();
          currentIndex++;
          tryNextSource();
        };
      } else if (!triedGoogleBooks) {
        if (currentIndex >= isbnsToTry.length) {
          triedGoogleBooks = true;
          currentIndex = 0;
          await tryNextSource();
          return;
        }
        const isbn = isbnsToTry[currentIndex];
        console.log(`[KB Plugin] Trying Google Books for ISBN: ${isbn}`);
        const googleCoverUrl = await this.apiClient.getGoogleBooksCover(isbn);
        if (googleCoverUrl) {
          const coverImg = container.createEl("img", {
            attr: {
              src: googleCoverUrl,
              alt: `Cover for ${book.title}`,
              loading: "lazy"
            }
          });
          coverImg.onerror = () => {
            coverImg.remove();
            currentIndex++;
            tryNextSource();
          };
        } else {
          currentIndex++;
          await tryNextSource();
        }
      } else {
        if (currentIndex >= isbnsToTry.length) {
          this.addCoverPlaceholder(container);
          return;
        }
        const isbn = isbnsToTry[currentIndex];
        console.log(`[KB Plugin] Trying Amazon for ISBN: ${isbn}`);
        const amazonCoverUrl = this.apiClient.getAmazonCoverUrl(isbn, this.plugin.settings.amazonRegion);
        const coverImg = container.createEl("img", {
          attr: {
            src: amazonCoverUrl,
            alt: `Cover for ${book.title}`,
            loading: "lazy"
          }
        });
        coverImg.onerror = () => {
          coverImg.remove();
          currentIndex++;
          tryNextSource();
        };
      }
    };
    await tryNextSource();
  }
  /**
   * Add a placeholder icon for books without covers
   */
  addCoverPlaceholder(container) {
    container.addClass("kb-book-cover-placeholder");
    const placeholder = container.createDiv("kb-cover-placeholder-icon");
    placeholder.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
      </svg>
    `;
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    if (this.suggestionsUI) {
      this.suggestionsUI.destroy();
      this.suggestionsUI = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
};

// src/advanced-modal.ts
var import_obsidian8 = require("obsidian");
var AdvancedSearchModal = class extends import_obsidian8.Modal {
  constructor(app, plugin) {
    super(app);
    this.results = [];
    this.plugin = plugin;
    this.apiClient = new KBApiClient(
      plugin.settings.prioritizeChildrensBooks,
      plugin.settings.useFuzzySearch,
      plugin.settings.enableLinkedDataEnrichment,
      plugin.settings.enableWikidataEnrichment
    );
    this.templateEngine = new TemplateEngine();
    this.templateReader = new TemplateReader(app);
    this.coverDownloadService = new CoverDownloadService(
      app,
      this.apiClient,
      this.templateEngine,
      plugin.settings
    );
    this.bookNoteCreatorService = new BookNoteCreatorService(
      app,
      this.templateEngine,
      this.templateReader,
      this.coverDownloadService,
      plugin.settings
    );
    this.criteria = this.getDefaultCriteria();
  }
  getDefaultCriteria() {
    return {
      title: "",
      author: "",
      isbn: "",
      subject: "",
      publisher: "",
      yearFrom: "",
      yearTo: "",
      language: "",
      series: "",
      matchMode: "all",
      includeChildrensBooks: false,
      onlyChildrensBooks: false
    };
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("kb-advanced-search-modal");
    contentEl.createEl("h2", { text: "Advanced Book Search" });
    contentEl.createEl("p", {
      text: "Fill in any combination of fields to build a complex search query",
      cls: "kb-advanced-hint"
    });
    const formContainer = contentEl.createDiv("kb-advanced-form");
    new import_obsidian8.Setting(formContainer).setName("Title").setDesc("Search in book titles").addText(
      (text) => text.setPlaceholder("e.g., Gruffalo, Little People Big Dreams").setValue(this.criteria.title).onChange((value) => {
        this.criteria.title = value;
      })
    );
    new import_obsidian8.Setting(formContainer).setName("Author").setDesc("Search by author name (tip: searches by last name for best results)").addText(
      (text) => text.setPlaceholder("e.g., Donaldson, Vegara").setValue(this.criteria.author).onChange((value) => {
        this.criteria.author = value;
      })
    );
    new import_obsidian8.Setting(formContainer).setName("ISBN").setDesc("Search by ISBN (exact match)").addText(
      (text) => text.setPlaceholder("e.g., 9789047704539").setValue(this.criteria.isbn).onChange((value) => {
        this.criteria.isbn = value;
      })
    );
    new import_obsidian8.Setting(formContainer).setName("Series").setDesc("Search for series name (Note: works best with OR mode or alone)").addText(
      (text) => text.setPlaceholder("e.g., Little People, Kikker, Muizenhuis").setValue(this.criteria.series).onChange((value) => {
        this.criteria.series = value;
      })
    );
    new import_obsidian8.Setting(formContainer).setName("Subject").setDesc("Search by subject/topic").addText(
      (text) => text.setPlaceholder("e.g., Vriendschap, Dieren, Avontuur").setValue(this.criteria.subject).onChange((value) => {
        this.criteria.subject = value;
      })
    );
    new import_obsidian8.Setting(formContainer).setName("Publisher").setDesc("Search by publisher name").addText(
      (text) => text.setPlaceholder("e.g., Vier Windstreken, Lemniscaat").setValue(this.criteria.publisher).onChange((value) => {
        this.criteria.publisher = value;
      })
    );
    const yearContainer = formContainer.createDiv("kb-year-range");
    new import_obsidian8.Setting(yearContainer).setName("Publication year").setDesc("Filter by publication year range").addText(
      (text) => text.setPlaceholder("From (e.g., 2000)").setValue(this.criteria.yearFrom).onChange((value) => {
        this.criteria.yearFrom = value;
      })
    ).addText(
      (text) => text.setPlaceholder("To (e.g., 2024)").setValue(this.criteria.yearTo).onChange((value) => {
        this.criteria.yearTo = value;
      })
    );
    new import_obsidian8.Setting(formContainer).setName("Language").setDesc("Filter by language").addDropdown(
      (dropdown) => dropdown.addOption("", "Any language").addOption("Nederlands", "Nederlands").addOption("Engels", "English").addOption("Duits", "German").addOption("Frans", "French").setValue(this.criteria.language).onChange((value) => {
        this.criteria.language = value;
      })
    );
    new import_obsidian8.Setting(formContainer).setName("Match mode").setDesc("How to combine multiple criteria").addDropdown(
      (dropdown) => dropdown.addOption("all", "Match ALL criteria (AND)").addOption("any", "Match ANY criteria (OR)").setValue(this.criteria.matchMode).onChange((value) => {
        this.criteria.matchMode = value;
      })
    );
    new import_obsidian8.Setting(formContainer).setName("Children's books").setDesc("Filter by children's literature subjects").addToggle(
      (toggle) => toggle.setTooltip("Only show children's books").setValue(this.criteria.onlyChildrensBooks).onChange((value) => {
        this.criteria.onlyChildrensBooks = value;
        if (value) {
          this.criteria.includeChildrensBooks = false;
        }
      })
    );
    const previewContainer = contentEl.createDiv("kb-query-preview");
    previewContainer.createEl("h3", { text: "Query Preview" });
    const previewEl = previewContainer.createEl("code", {
      cls: "kb-query-preview-text"
    });
    const updatePreview = () => {
      const query = this.buildQuery();
      previewEl.textContent = query || "(empty query)";
    };
    const buttonContainer = contentEl.createDiv("kb-advanced-buttons");
    new import_obsidian8.Setting(buttonContainer).addButton(
      (button) => button.setButtonText("Clear").setTooltip("Clear all fields").onClick(() => {
        this.criteria = this.getDefaultCriteria();
        this.close();
        this.open();
      })
    );
    new import_obsidian8.Setting(buttonContainer).addButton(
      (button) => button.setButtonText("Preview Query").setTooltip("Show the generated CQL query").onClick(() => {
        updatePreview();
      })
    );
    new import_obsidian8.Setting(buttonContainer).addButton(
      (button) => button.setButtonText("Search").setCta().setTooltip("Execute the advanced search").onClick(async () => {
        await this.executeSearch();
      })
    );
    contentEl.createDiv("kb-advanced-results");
    updatePreview();
  }
  /**
   * Build CQL query from criteria
   */
  buildQuery() {
    const parts = [];
    if (this.criteria.isbn.trim()) {
      return `dc.identifier=${this.criteria.isbn.trim()}`;
    }
    if (this.criteria.title.trim()) {
      parts.push(`dc.title all "${this.criteria.title.trim()}"`);
    }
    if (this.criteria.author.trim()) {
      const authorInput = this.criteria.author.trim();
      if (!authorInput.includes(",")) {
        const words = authorInput.split(/\s+/);
        const lastName = words[words.length - 1];
        parts.push(`dc.creator all "${lastName}"`);
      } else {
        parts.push(`dc.creator all "${authorInput}"`);
      }
    }
    if (this.criteria.series.trim()) {
      const hasOtherCriteria = this.criteria.title || this.criteria.author || this.criteria.subject || this.criteria.publisher;
      if (!hasOtherCriteria || this.criteria.matchMode === "any") {
        parts.push(`dc.title all "${this.criteria.series.trim()}"`);
      }
    }
    if (this.criteria.subject.trim()) {
      parts.push(`dc.subject all "${this.criteria.subject.trim()}"`);
    }
    if (this.criteria.publisher.trim()) {
      let publisherQuery = this.criteria.publisher.trim();
      publisherQuery = publisherQuery.replace(/^\[.*?\]\s*:\s*/, "");
      publisherQuery = publisherQuery.replace(/^(De|Het)\s+/i, "");
      parts.push(`dc.publisher all "${publisherQuery}"`);
    }
    if (this.criteria.yearFrom.trim() || this.criteria.yearTo.trim()) {
      const yearFrom = this.criteria.yearFrom.trim() || "1900";
      const yearTo = this.criteria.yearTo.trim() || "2100";
      parts.push(`dc.date>=${yearFrom} AND dc.date<=${yearTo}`);
    }
    if (this.criteria.language.trim()) {
      parts.push(`dc.language="${this.criteria.language}"`);
    }
    if (parts.length === 0) {
      new import_obsidian8.Notice("Please enter at least one search criterion");
      return "";
    }
    const operator = this.criteria.matchMode === "all" ? " AND " : " OR ";
    let query = parts.length > 1 ? `(${parts.join(operator)})` : parts[0];
    if (this.criteria.onlyChildrensBooks) {
      query = `(${query}) AND (dc.subject=Jeugd OR dc.subject="Jeugdliteratuur" OR dc.subject="Prentenboeken")`;
    }
    return query;
  }
  /**
   * Execute the advanced search
   */
  async executeSearch() {
    const query = this.buildQuery();
    if (!query) {
      return;
    }
    try {
      console.log("[KB Plugin] Advanced search query:", query);
      const encodedQuery = encodeURIComponent(query);
      const url = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${encodedQuery}&maximumRecords=20&x-fields=ISBN`;
      new import_obsidian8.Notice("Searching...");
      const response = await this.apiClient.performSearch(url);
      console.log("[KB Plugin] Advanced search results:", response.length);
      if (response.length === 0) {
        new import_obsidian8.Notice("No results found. Try adjusting your criteria.");
        return;
      }
      this.results = response;
      this.displayResults(response);
    } catch (error) {
      console.error("[KB Plugin] Advanced search error:", error);
      new import_obsidian8.Notice("Search failed. Please try again.");
    }
  }
  /**
   * Display search results
   */
  displayResults(results) {
    const { contentEl } = this;
    const resultsContainer = contentEl.querySelector(
      ".kb-advanced-results"
    );
    if (!resultsContainer) return;
    resultsContainer.empty();
    resultsContainer.createEl("h3", { text: `Found ${results.length} result(s)` });
    const resultsList = resultsContainer.createDiv("kb-results-list");
    results.forEach((book) => {
      const bookEl = resultsList.createDiv("kb-book-result");
      bookEl.createEl("h4", { text: book.title });
      if (book.authors && book.authors.length > 0) {
        bookEl.createEl("p", {
          text: `By: ${book.authors.join(", ")}`,
          cls: "kb-book-authors"
        });
      }
      const details = [];
      if (book.isbn) details.push(`ISBN: ${book.isbn}`);
      if (book.publishYear) details.push(`Year: ${book.publishYear}`);
      if (book.publisher) details.push(`Publisher: ${book.publisher}`);
      if (details.length > 0) {
        bookEl.createEl("p", {
          text: details.join(" | "),
          cls: "kb-book-details"
        });
      }
      if (book.series) {
        bookEl.createEl("p", {
          text: `Series: ${book.series}`,
          cls: "kb-book-series"
        });
      }
      if (book.subjects && book.subjects.length > 0) {
        bookEl.createEl("p", {
          text: `Subjects: ${book.subjects.slice(0, 3).join(", ")}`,
          cls: "kb-book-subjects"
        });
      }
      const selectBtn = bookEl.createEl("button", {
        text: "Select this book",
        cls: "kb-select-button"
      });
      selectBtn.onclick = async () => {
        try {
          await this.createBookNote(book);
          this.close();
        } catch (error) {
          console.error("[KB Plugin] Error creating book note:", error);
          new import_obsidian8.Notice("Failed to create book note. Check console for details.");
        }
      };
    });
  }
  /**
   * Create a book note from selected metadata
   */
  async createBookNote(metadata) {
    try {
      await this.bookNoteCreatorService.createBookNote(metadata, {
        openFile: true,
        runTemplater: true,
        showNotice: true,
        showCoverSource: false
      });
    } catch (error) {
      console.error("[KB Plugin] Error creating book note:", error);
    }
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};

// src/browse-view.ts
var import_obsidian10 = require("obsidian");

// src/book-detail-modal.ts
var import_obsidian9 = require("obsidian");
var BookDetailModal = class extends import_obsidian9.Modal {
  constructor(plugin, book, apiClient, onNoteCreated, onAuthorClicked, onSubjectsSearch, onLinkedDataUriSearch) {
    super(plugin.app);
    this.selectedSubjects = /* @__PURE__ */ new Set();
    this.plugin = plugin;
    this.book = book;
    this.apiClient = apiClient;
    this.onNoteCreated = onNoteCreated;
    this.onAuthorClicked = onAuthorClicked;
    this.onSubjectsSearch = onSubjectsSearch;
    this.onLinkedDataUriSearch = onLinkedDataUriSearch;
    this.templateEngine = new TemplateEngine();
    this.templateReader = new TemplateReader(this.app);
    this.wikidataClient = new WikidataApiClient();
    this.coverDownloadService = new CoverDownloadService(
      this.app,
      apiClient,
      this.templateEngine,
      plugin.settings
    );
    this.bookNoteCreatorService = new BookNoteCreatorService(
      this.app,
      this.templateEngine,
      this.templateReader,
      this.coverDownloadService,
      plugin.settings
    );
  }
  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("kb-book-detail-modal");
    console.log("[KB Plugin] Opening detail modal for:", this.book.title);
    console.log("[KB Plugin] Book has PPN:", this.book.ppn);
    console.log("[KB Plugin] Book has linkedData:", !!this.book.linkedData);
    if (this.book.linkedData) {
      console.log("[KB Plugin] Linked data:", this.book.linkedData);
    }
    await this.enrichWithWikidata();
    const coverBg = contentEl.createDiv("kb-detail-cover-bg");
    if (this.book.coverUrl) {
      coverBg.style.backgroundImage = `url(${this.book.coverUrl})`;
    }
    const mainContent = contentEl.createDiv("kb-detail-content");
    const coverSection = mainContent.createDiv("kb-detail-cover-section");
    const coverContainer = coverSection.createDiv("kb-detail-cover");
    if (this.book.coverUrl) {
      coverContainer.createEl("img", {
        attr: {
          src: this.book.coverUrl,
          alt: `Cover for ${this.book.title}`
        }
      });
    } else {
      coverContainer.addClass("kb-detail-cover-placeholder");
      const placeholder = coverContainer.createDiv("kb-detail-cover-placeholder-icon");
      placeholder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
    }
    const infoSection = mainContent.createDiv("kb-detail-info");
    infoSection.createEl("h2", {
      text: this.book.title,
      cls: "kb-detail-title"
    });
    if (this.book.authors && this.book.authors.length > 0) {
      const authorContainer = infoSection.createEl("p", {
        cls: "kb-detail-author"
      });
      this.book.authors.forEach((author, index) => {
        if (this.onAuthorClicked) {
          const authorLink = authorContainer.createEl("a", {
            text: author,
            cls: "kb-detail-author-link"
          });
          authorLink.onclick = () => {
            if (this.onAuthorClicked) {
              this.onAuthorClicked(author);
            }
          };
          this.addAuthorTooltip(authorLink, author);
        } else {
          authorContainer.appendText(author);
        }
        if (index < this.book.authors.length - 1) {
          authorContainer.appendText(", ");
        }
      });
    }
    const metaGrid = infoSection.createDiv("kb-detail-meta-grid");
    if (this.book.publisher) {
      this.addMetaItem(metaGrid, "Publisher", this.book.publisher);
    }
    if (this.book.publishYear) {
      this.addMetaItem(metaGrid, "Year", this.book.publishYear);
    }
    if (this.book.isbn) {
      this.addMetaItem(metaGrid, "ISBN", this.book.isbn);
    }
    if (this.book.series) {
      this.addMetaItem(metaGrid, "Series", this.book.series);
    }
    if (this.book.pageCount) {
      this.addMetaItem(metaGrid, "Pages", this.book.pageCount);
    }
    if (this.book.language) {
      this.addMetaItem(metaGrid, "Language", this.book.language);
    }
    if (this.book.description) {
      const descSection = infoSection.createDiv("kb-detail-description-section");
      descSection.createEl("h3", { text: "Description" });
      descSection.createEl("p", {
        text: this.book.description,
        cls: "kb-detail-description"
      });
    }
    if (this.book.subjects && this.book.subjects.length > 0) {
      const subjectSection = infoSection.createDiv("kb-detail-subjects-section");
      const subjectHeader = subjectSection.createDiv("kb-detail-subjects-header");
      subjectHeader.createEl("h3", { text: "Subjects" });
      if (this.onSubjectsSearch) {
        subjectHeader.createEl("span", {
          text: "Click to select subjects",
          cls: "kb-detail-subjects-hint"
        });
      }
      const subjectTags = subjectSection.createDiv("kb-detail-subjects");
      this.book.subjects.slice(0, 10).forEach((subject) => {
        const tag = subjectTags.createEl("span", {
          text: subject,
          cls: "kb-detail-subject-tag"
        });
        this.addSubjectTooltip(tag, subject);
        if (this.onSubjectsSearch) {
          tag.addClass("kb-detail-subject-tag-selectable");
          tag.onclick = () => {
            if (this.selectedSubjects.has(subject)) {
              this.selectedSubjects.delete(subject);
              tag.removeClass("kb-detail-subject-tag-selected");
            } else {
              this.selectedSubjects.add(subject);
              tag.addClass("kb-detail-subject-tag-selected");
            }
            this.updateSubjectSearchButton();
          };
        }
      });
      if (this.onSubjectsSearch) {
        const searchBtn = subjectSection.createEl("button", {
          text: "Search by selected subjects",
          cls: "kb-detail-subjects-search-btn"
        });
        searchBtn.style.display = "none";
        searchBtn.onclick = () => {
          if (this.selectedSubjects.size > 0 && this.onSubjectsSearch) {
            this.onSubjectsSearch(Array.from(this.selectedSubjects));
          }
        };
      }
    }
    if (this.book.linkedData && (this.book.linkedData.creators && this.book.linkedData.creators.length > 0 || this.book.linkedData.subjects && this.book.linkedData.subjects.length > 0 || this.book.linkedData.series && this.book.linkedData.series.length > 0)) {
      const linkedDataSection = infoSection.createDiv("kb-detail-linked-data-section");
      linkedDataSection.createEl("h3", { text: "Linked Data" });
      linkedDataSection.createEl("p", {
        text: "Enriched information from data.bibliotheken.nl - click to explore",
        cls: "kb-detail-linked-data-hint"
      });
      if (this.book.linkedData.creators && this.book.linkedData.creators.length > 0) {
        console.log("[KB Plugin] Rendering creators:", this.book.linkedData.creators);
        const creatorsContainer = linkedDataSection.createDiv("kb-detail-linked-creators");
        creatorsContainer.createEl("h4", { text: "Creators", cls: "kb-detail-linked-subtitle" });
        const creatorsGrid = creatorsContainer.createDiv("kb-detail-linked-grid");
        this.book.linkedData.creators.forEach((creator) => {
          console.log("[KB Plugin] Creator wikidataProfile:", creator.wikidataProfile);
          const creatorCard = creatorsGrid.createDiv("kb-detail-linked-card");
          if (creator.wikidataProfile && creator.wikidataProfile.imageUrl) {
            const authorImage = creatorCard.createDiv("kb-detail-wikidata-author-image");
            authorImage.createEl("img", {
              attr: {
                src: creator.wikidataProfile.imageUrl,
                alt: `Photo of ${creator.label}`
              }
            });
          }
          const creatorInfo = creatorCard.createDiv("kb-detail-wikidata-author-info");
          const creatorHeader = creatorInfo.createDiv("kb-detail-linked-card-header");
          creatorHeader.createEl("span", {
            text: creator.label || "Unknown Creator",
            cls: "kb-detail-linked-label"
          });
          const birthDate = creator.wikidataProfile?.birthDate || creator.birthDate;
          const deathDate = creator.wikidataProfile?.deathDate || creator.deathDate;
          if (birthDate || deathDate) {
            creatorInfo.createEl("p", {
              text: `${birthDate || "?"} - ${deathDate || "present"}`,
              cls: "kb-detail-linked-dates"
            });
          }
          if (creator.wikidataProfile?.occupation && creator.wikidataProfile.occupation.length > 0) {
            creatorInfo.createEl("p", {
              text: creator.wikidataProfile.occupation.join(", "),
              cls: "kb-detail-wikidata-occupation"
            });
          }
          const description = creator.wikidataProfile?.description || creator.description;
          if (description) {
            creatorInfo.createEl("p", {
              text: description,
              cls: "kb-detail-linked-description"
            });
          }
          const creatorActions = creatorCard.createDiv("kb-detail-linked-actions");
          const searchBtn = creatorActions.createEl("button", {
            text: "Find all books",
            cls: "kb-detail-linked-btn"
          });
          searchBtn.onclick = () => {
            if (this.onLinkedDataUriSearch) {
              this.onLinkedDataUriSearch(creator.uri, "creator");
            }
          };
          creatorActions.createEl("a", {
            text: "View URI",
            cls: "kb-detail-linked-uri",
            attr: {
              href: creator.uri,
              target: "_blank"
            }
          });
          if (creator.wikidataProfile?.wikipediaUrl) {
            creatorActions.createEl("a", {
              text: "Wikipedia",
              cls: "kb-detail-wikidata-wiki-link",
              attr: {
                href: creator.wikidataProfile.wikipediaUrl,
                target: "_blank"
              }
            });
          }
        });
      }
      if (this.book.linkedData.subjects && this.book.linkedData.subjects.length > 0) {
        const subjectsContainer = linkedDataSection.createDiv("kb-detail-linked-subjects");
        subjectsContainer.createEl("h4", { text: "Subject URIs", cls: "kb-detail-linked-subtitle" });
        const subjectsGrid = subjectsContainer.createDiv("kb-detail-linked-grid");
        this.book.linkedData.subjects.forEach((subject) => {
          const subjectCard = subjectsGrid.createDiv("kb-detail-linked-card");
          const subjectHeader = subjectCard.createDiv("kb-detail-linked-card-header");
          subjectHeader.createEl("span", {
            text: subject.label || "Unknown Subject",
            cls: "kb-detail-linked-label"
          });
          if (subject.description) {
            subjectCard.createEl("p", {
              text: subject.description,
              cls: "kb-detail-linked-description"
            });
          }
          const subjectActions = subjectCard.createDiv("kb-detail-linked-actions");
          const searchBtn = subjectActions.createEl("button", {
            text: "Find all books",
            cls: "kb-detail-linked-btn"
          });
          searchBtn.onclick = () => {
            if (this.onLinkedDataUriSearch) {
              this.onLinkedDataUriSearch(subject.uri, "subject");
            }
          };
          subjectActions.createEl("a", {
            text: "View URI",
            cls: "kb-detail-linked-uri",
            attr: {
              href: subject.uri,
              target: "_blank"
            }
          });
        });
      }
      if (this.book.linkedData.series && this.book.linkedData.series.length > 0) {
        const seriesContainer = linkedDataSection.createDiv("kb-detail-linked-series");
        seriesContainer.createEl("h4", { text: "Series", cls: "kb-detail-linked-subtitle" });
        const seriesGrid = seriesContainer.createDiv("kb-detail-linked-grid");
        this.book.linkedData.series.forEach((series) => {
          const seriesCard = seriesGrid.createDiv("kb-detail-linked-card");
          const seriesHeader = seriesCard.createDiv("kb-detail-linked-card-header");
          seriesHeader.createEl("span", {
            text: series.label || "Unknown Series",
            cls: "kb-detail-linked-label"
          });
          if (series.description) {
            seriesCard.createEl("p", {
              text: series.description,
              cls: "kb-detail-linked-description"
            });
          }
          const seriesActions = seriesCard.createDiv("kb-detail-linked-actions");
          const searchBtn = seriesActions.createEl("button", {
            text: "Find all books in series",
            cls: "kb-detail-linked-btn"
          });
          searchBtn.onclick = () => {
            if (this.onLinkedDataUriSearch) {
              this.onLinkedDataUriSearch(series.uri, "series");
            }
          };
          seriesActions.createEl("a", {
            text: "View URI",
            cls: "kb-detail-linked-uri",
            attr: {
              href: series.uri,
              target: "_blank"
            }
          });
        });
      }
    }
    if (this.wikidataAuthorInfo || this.wikidataCharacterInfo) {
      const wikidataSection = infoSection.createDiv("kb-detail-wikidata-section");
      wikidataSection.createEl("h3", { text: "Additional Information" });
      if (this.wikidataAuthorInfo) {
        const authorSection = wikidataSection.createDiv("kb-detail-wikidata-author");
        if (this.wikidataAuthorInfo.imageUrl) {
          const authorImage = authorSection.createDiv("kb-detail-wikidata-author-image");
          authorImage.createEl("img", {
            attr: {
              src: this.wikidataAuthorInfo.imageUrl,
              alt: `Photo of ${this.wikidataAuthorInfo.name}`
            }
          });
        }
        const authorInfo = authorSection.createDiv("kb-detail-wikidata-author-info");
        if (this.wikidataAuthorInfo.birthDate || this.wikidataAuthorInfo.deathDate) {
          authorInfo.createEl("p", {
            text: `${this.wikidataAuthorInfo.birthDate || "?"} - ${this.wikidataAuthorInfo.deathDate || "present"}`,
            cls: "kb-detail-wikidata-dates"
          });
        }
        if (this.wikidataAuthorInfo.description) {
          authorInfo.createEl("p", {
            text: this.wikidataAuthorInfo.description,
            cls: "kb-detail-wikidata-description"
          });
        }
        if (this.wikidataAuthorInfo.wikipediaUrl) {
          authorSection.createEl("a", {
            text: "View on Wikipedia",
            cls: "kb-detail-wikidata-wiki-link",
            attr: {
              href: this.wikidataAuthorInfo.wikipediaUrl,
              target: "_blank"
            }
          });
        }
      }
      if (this.wikidataCharacterInfo) {
        const characterSection = wikidataSection.createDiv("kb-detail-wikidata-character");
        if (this.wikidataCharacterInfo.imageUrl) {
          const characterImage = characterSection.createDiv("kb-detail-wikidata-character-image");
          characterImage.createEl("img", {
            attr: {
              src: this.wikidataCharacterInfo.imageUrl,
              alt: `Image of ${this.wikidataCharacterInfo.name}`
            }
          });
        }
        const characterInfo = characterSection.createDiv("kb-detail-wikidata-character-info");
        characterInfo.createEl("h4", { text: this.wikidataCharacterInfo.name });
        if (this.wikidataCharacterInfo.description) {
          characterInfo.createEl("p", {
            text: this.wikidataCharacterInfo.description,
            cls: "kb-detail-wikidata-description"
          });
        }
        if (this.wikidataCharacterInfo.wikipediaUrl) {
          characterSection.createEl("a", {
            text: "View on Wikipedia",
            cls: "kb-detail-wikidata-wiki-link",
            attr: {
              href: this.wikidataCharacterInfo.wikipediaUrl,
              target: "_blank"
            }
          });
        }
      }
    }
    const actionsSection = infoSection.createDiv("kb-detail-actions");
    if (this.book.ppn) {
      actionsSection.createEl("a", {
        text: "View on KB.nl",
        cls: "kb-detail-link-btn",
        attr: {
          href: `https://webggc.oclc.org/cbs/DB=3.34/CMD?ACT=SRCHA&IKT=12&TRM=ppn+${this.book.ppn}`,
          target: "_blank"
        }
      });
    } else if (this.book.isbn) {
      actionsSection.createEl("a", {
        text: "Search on KB.nl",
        cls: "kb-detail-link-btn",
        attr: {
          href: `https://webggc.oclc.org/cbs/DB=3.34/CMD?ACT=SRCHA&IKT=7&TRM=${encodeURIComponent(this.book.isbn)}`,
          target: "_blank"
        }
      });
    }
    const createBtn = actionsSection.createEl("button", {
      text: "Create Note",
      cls: "kb-detail-create-btn"
    });
    createBtn.onclick = async () => {
      createBtn.disabled = true;
      createBtn.textContent = "Creating...";
      try {
        await this.createBookNote();
        createBtn.textContent = "\u2713 Note Created";
        createBtn.addClass("kb-detail-btn-success");
        this.onNoteCreated();
        setTimeout(() => {
          this.close();
        }, 1e3);
      } catch (error) {
        console.error("[KB Plugin] Error creating note:", error);
        new import_obsidian9.Notice("Failed to create note. Check console for details.");
        createBtn.disabled = false;
        createBtn.textContent = "Create Note";
      }
    };
  }
  /**
   * Enrich book information with Wikidata data
   */
  async enrichWithWikidata() {
    try {
      if (this.book.authors && this.book.authors.length > 0) {
        const primaryAuthor = this.book.authors[0];
        this.wikidataAuthorInfo = await this.wikidataClient.getAuthorInfo(primaryAuthor);
      }
      if (this.book.title.toLowerCase().includes("nijntje") || this.book.title.toLowerCase().includes("miffy") || this.book.series?.toLowerCase().includes("jip en janneke")) {
        let characterName = "";
        if (this.book.title.toLowerCase().includes("nijntje") || this.book.title.toLowerCase().includes("miffy")) {
          characterName = "Miffy";
        } else if (this.book.series?.toLowerCase().includes("jip en janneke")) {
          characterName = "Jip en Janneke";
        }
        if (characterName) {
          this.wikidataCharacterInfo = await this.wikidataClient.getCharacterInfo(characterName);
        }
      }
    } catch (error) {
      console.error("[KB Plugin] Error enriching with Wikidata:", error);
    }
  }
  addMetaItem(container, label, value) {
    const item = container.createDiv("kb-detail-meta-item");
    item.createEl("span", { text: label, cls: "kb-detail-meta-label" });
    item.createEl("span", { text: value, cls: "kb-detail-meta-value" });
  }
  updateSubjectSearchButton() {
    const btn = this.contentEl.querySelector(".kb-detail-subjects-search-btn");
    if (btn) {
      if (this.selectedSubjects.size > 0) {
        btn.style.display = "block";
        btn.textContent = `Search by ${this.selectedSubjects.size} selected subject${this.selectedSubjects.size > 1 ? "s" : ""}`;
      } else {
        btn.style.display = "none";
      }
    }
  }
  async createBookNote() {
    try {
      await this.bookNoteCreatorService.createBookNote(this.book, {
        openFile: false,
        // Don't open file in detail modal
        runTemplater: false,
        // Don't run templater in detail modal
        showNotice: true,
        showCoverSource: false
      });
    } catch (error) {
      console.error("[KB Plugin] Error creating book note:", error);
      throw error;
    }
  }
  /**
   * Add hover tooltip to author link showing additional information
   */
  addAuthorTooltip(element, authorName) {
    let tooltip = null;
    let tooltipTimeout = null;
    element.addEventListener("mouseenter", async () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
      }
      tooltipTimeout = setTimeout(async () => {
        tooltip = this.contentEl.createDiv("kb-tooltip");
        const creatorInfo = this.book.linkedData?.creators?.find(
          (creator) => creator.label?.toLowerCase().includes(authorName.toLowerCase())
        );
        const tooltipContent = tooltip.createDiv("kb-tooltip-content");
        tooltipContent.createEl("div", {
          text: authorName,
          cls: "kb-tooltip-title"
        });
        if (creatorInfo) {
          if (creatorInfo.birthDate || creatorInfo.deathDate) {
            tooltipContent.createEl("div", {
              text: `${creatorInfo.birthDate || "?"} - ${creatorInfo.deathDate || "?"}`,
              cls: "kb-tooltip-dates"
            });
          }
          if (creatorInfo.description) {
            tooltipContent.createEl("div", {
              text: creatorInfo.description,
              cls: "kb-tooltip-description"
            });
          }
          tooltipContent.createEl("div", {
            text: "\u{1F517} Linked data available",
            cls: "kb-tooltip-badge"
          });
        } else {
          try {
            const wikidataInfo = await this.wikidataClient.getAuthorInfo(authorName);
            if (wikidataInfo) {
              if (wikidataInfo.birthDate || wikidataInfo.deathDate) {
                tooltipContent.createEl("div", {
                  text: `${wikidataInfo.birthDate || "?"} - ${wikidataInfo.deathDate || "present"}`,
                  cls: "kb-tooltip-dates"
                });
              }
              if (wikidataInfo.description) {
                tooltipContent.createEl("div", {
                  text: wikidataInfo.description,
                  cls: "kb-tooltip-description"
                });
              }
              tooltipContent.createEl("div", {
                text: "W Wikidata enriched",
                cls: "kb-tooltip-badge"
              });
            } else {
              tooltipContent.createEl("div", {
                text: "Click to search for books",
                cls: "kb-tooltip-hint"
              });
            }
          } catch (error) {
            console.error("[KB Plugin] Error fetching Wikidata for tooltip:", error);
            tooltipContent.createEl("div", {
              text: "Click to search for books",
              cls: "kb-tooltip-hint"
            });
          }
        }
        const rect = element.getBoundingClientRect();
        tooltip.style.top = `${rect.bottom + 5}px`;
        tooltip.style.left = `${rect.left}px`;
      }, 300);
    });
    element.addEventListener("mouseleave", () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
      }
      if (tooltip) {
        tooltip.remove();
        tooltip = null;
      }
    });
  }
  /**
   * Add hover tooltip to subject tag showing additional information
   */
  addSubjectTooltip(element, subjectName) {
    let tooltip = null;
    let tooltipTimeout = null;
    element.addEventListener("mouseenter", async () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
      }
      tooltipTimeout = setTimeout(async () => {
        tooltip = this.contentEl.createDiv("kb-tooltip");
        const subjectInfo = this.book.linkedData?.subjects?.find(
          (subject) => subject.label?.toLowerCase().includes(subjectName.toLowerCase())
        );
        const tooltipContent = tooltip.createDiv("kb-tooltip-content");
        tooltipContent.createEl("div", {
          text: subjectName,
          cls: "kb-tooltip-title"
        });
        if (subjectInfo) {
          if (subjectInfo.description) {
            tooltipContent.createEl("div", {
              text: subjectInfo.description,
              cls: "kb-tooltip-description"
            });
          }
          if (subjectInfo.broader && subjectInfo.broader.length > 0) {
            tooltipContent.createEl("div", {
              text: `Parent: ${subjectInfo.broader.map((b) => b.split("/").pop()).join(", ")}`,
              cls: "kb-tooltip-hierarchy"
            });
          }
          if (subjectInfo.narrower && subjectInfo.narrower.length > 0) {
            tooltipContent.createEl("div", {
              text: `Children: ${subjectInfo.narrower.map((n) => n.split("/").pop()).join(", ")}`,
              cls: "kb-tooltip-hierarchy"
            });
          }
          tooltipContent.createEl("div", {
            text: "\u{1F517} Linked data available",
            cls: "kb-tooltip-badge"
          });
        } else {
          tooltipContent.createEl("div", {
            text: "Click to select for search",
            cls: "kb-tooltip-hint"
          });
        }
        const rect = element.getBoundingClientRect();
        tooltip.style.top = `${rect.bottom + 5}px`;
        tooltip.style.left = `${rect.left}px`;
      }, 300);
    });
    element.addEventListener("mouseleave", () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
      }
      if (tooltip) {
        tooltip.remove();
        tooltip = null;
      }
    });
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};

// src/browse-view.ts
var VIEW_TYPE_KB_BROWSE = "kb-browse-view";
var KBBrowseView = class extends import_obsidian10.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.results = [];
    this.createdBooks = /* @__PURE__ */ new Set();
    this.currentQuery = "";
    this.currentStartRecord = 1;
    this.hasMoreResults = true;
    this.isLoading = false;
    this.navigationHistory = [];
    this.resultsContainerEl = null;
    this.suggestionsUI = null;
    this.debounceTimer = null;
    this.plugin = plugin;
    this.apiClient = new KBApiClient(
      plugin.settings.prioritizeChildrensBooks,
      plugin.settings.useFuzzySearch,
      plugin.settings.enableLinkedDataEnrichment,
      plugin.settings.enableWikidataEnrichment
    );
    this.templateEngine = new TemplateEngine();
    this.templateReader = new TemplateReader(this.app);
    this.coverDownloadService = new CoverDownloadService(
      this.app,
      this.apiClient,
      this.templateEngine,
      plugin.settings
    );
    this.bookNoteCreatorService = new BookNoteCreatorService(
      this.app,
      this.templateEngine,
      this.templateReader,
      this.coverDownloadService,
      plugin.settings
    );
    this.suggester = new SearchSuggester();
  }
  getViewType() {
    return VIEW_TYPE_KB_BROWSE;
  }
  getDisplayText() {
    return "Browse Books";
  }
  getIcon() {
    return "book-open";
  }
  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("kb-browse-view");
    const header = container.createDiv("kb-browse-header");
    const headerTitle = header.createDiv("kb-browse-header-title");
    const backBtn = headerTitle.createEl("button", {
      text: "\u2190 Back",
      cls: "kb-browse-back-btn"
    });
    backBtn.style.display = "none";
    backBtn.onclick = () => this.navigateBack();
    headerTitle.createEl("h2", { text: "Browse & Explore Books" });
    const searchContainer = container.createDiv("kb-browse-search");
    searchContainer.style.position = "relative";
    let searchInput;
    const performSearch = async () => {
      const query = searchInput.getValue().trim();
      if (!query) {
        new import_obsidian10.Notice("Please enter a search query");
        return;
      }
      if (this.suggestionsUI) {
        this.suggestionsUI.hide();
      }
      this.suggester.saveSearch(query);
      resultsContainer.empty();
      resultsContainer.createEl("p", { text: "Searching...", cls: "kb-searching" });
      await this.searchAndDisplay(query, resultsContainer);
    };
    this.suggestionsUI = new SearchSuggestionsUI(
      searchContainer,
      (suggestion) => {
        searchInput.setValue(suggestion.text);
        this.suggestionsUI?.hide();
        performSearch();
      }
    );
    new import_obsidian10.Setting(searchContainer).setName("Search").addText((text) => {
      searchInput = text;
      text.setPlaceholder("Search for books...").onChange(async (value) => {
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(async () => {
          if (value.trim().length >= 2) {
            const suggestions = await this.suggester.getSuggestions(value);
            this.suggestionsUI?.show(suggestions);
          } else if (value.trim().length === 0) {
            const suggestions = await this.suggester.getSuggestions("");
            this.suggestionsUI?.show(suggestions);
          } else {
            this.suggestionsUI?.hide();
          }
        }, 300);
      });
      text.inputEl.addEventListener("keydown", async (event) => {
        if (this.suggestionsUI?.isVisible()) {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            this.suggestionsUI.navigateDown();
            return;
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            this.suggestionsUI.navigateUp();
            return;
          } else if (event.key === "Escape") {
            event.preventDefault();
            this.suggestionsUI.hide();
            return;
          } else if (event.key === "Enter") {
            if (this.suggestionsUI.selectCurrent()) {
              event.preventDefault();
              return;
            }
          }
        }
        if (event.key === "Enter") {
          event.preventDefault();
          await performSearch();
        }
      });
      text.inputEl.addEventListener("blur", () => {
        setTimeout(() => {
          this.suggestionsUI?.hide();
        }, 200);
      });
      text.inputEl.addEventListener("focus", async () => {
        const value = searchInput.getValue();
        if (value.trim().length >= 2) {
          const suggestions = await this.suggester.getSuggestions(value);
          this.suggestionsUI?.show(suggestions);
        } else if (value.trim().length === 0) {
          const suggestions = await this.suggester.getSuggestions("");
          this.suggestionsUI?.show(suggestions);
        }
      });
    }).addButton(
      (button) => button.setButtonText("Search").setCta().onClick(async () => {
        await performSearch();
      })
    );
    const resultsContainer = container.createDiv("kb-browse-results");
    this.resultsContainerEl = resultsContainer;
    resultsContainer.createEl("p", {
      text: "Enter a search query to browse books",
      cls: "kb-browse-hint"
    });
    setTimeout(() => {
      if (searchInput && searchInput.inputEl) {
        searchInput.inputEl.focus();
      }
    }, 100);
  }
  async searchAndDisplay(query, container, append = false) {
    try {
      if (!append) {
        this.currentQuery = query;
        this.currentStartRecord = 1;
        this.results = [];
        this.hasMoreResults = true;
      }
      this.isLoading = true;
      console.log("[KB Plugin] Browse search:", query, "startRecord:", this.currentStartRecord);
      const batchSize = 50;
      const newResults = await this.apiClient.searchBooks(query, batchSize, this.currentStartRecord);
      console.log("[KB Plugin] Found", newResults.length, "new results");
      if (newResults.length < batchSize) {
        this.hasMoreResults = false;
      }
      if (this.plugin.settings.enrichFromBol && newResults.length > 0) {
        console.log("[KB Plugin] Enriching results from Bol.com...");
        const enrichedResults = await Promise.all(
          newResults.map(async (book) => {
            try {
              return await this.apiClient.enrichFromBol(book);
            } catch (error) {
              console.error("[KB Plugin] Error enriching book:", error);
              return book;
            }
          })
        );
        this.results.push(...enrichedResults);
      } else {
        this.results.push(...newResults);
      }
      this.currentStartRecord += newResults.length;
      this.isLoading = false;
      this.displayResults(container);
    } catch (error) {
      console.error("[KB Plugin] Browse search error:", error);
      this.isLoading = false;
      container.empty();
      container.createEl("p", {
        text: "An error occurred while searching. Please try again.",
        cls: "kb-error"
      });
    }
  }
  displayResults(container) {
    container.empty();
    if (this.results.length === 0) {
      container.createEl("p", { text: "No results found", cls: "kb-no-results" });
      return;
    }
    container.createEl("p", {
      text: `Found ${this.results.length} result(s)`,
      cls: "kb-browse-count"
    });
    const linkedDataCount = this.results.filter(
      (book) => book.linkedData && (book.linkedData.creators && book.linkedData.creators.length > 0 || book.linkedData.subjects && book.linkedData.subjects.length > 0 || book.linkedData.series && book.linkedData.series.length > 0)
    ).length;
    const wikidataCount = this.results.filter(
      (book) => book.authors && book.authors.length > 0
    ).length;
    if (this.results.length > 0) {
      const statsBar = container.createDiv("kb-browse-stats-bar");
      if (linkedDataCount > 0) {
        statsBar.createEl("span", {
          text: `${linkedDataCount} with linked data`,
          cls: "kb-browse-stat kb-browse-stat-ld"
        });
      }
      if (wikidataCount > 0) {
        statsBar.createEl("span", {
          text: `${wikidataCount} with Wikidata`,
          cls: "kb-browse-stat kb-browse-stat-wikidata"
        });
      }
    }
    const gridContainer = container.createDiv("kb-browse-grid");
    this.results.forEach((book) => {
      const card = gridContainer.createDiv("kb-browse-card");
      const isCreated = this.createdBooks.has(book.isbn || book.title);
      if (isCreated) {
        card.addClass("kb-browse-card-created");
      }
      const coverContainer = card.createDiv("kb-browse-cover");
      if (book.coverUrl) {
        console.log(`[KB Plugin] Cover URL for "${book.title}":`, book.coverUrl);
        const img = coverContainer.createEl("img", {
          attr: {
            src: book.coverUrl,
            alt: `Cover for ${book.title}`,
            loading: "lazy"
          }
        });
        img.onerror = () => {
          console.log(`[KB Plugin] Cover failed to load for "${book.title}":`, book.coverUrl);
          coverContainer.empty();
          coverContainer.addClass("kb-browse-cover-placeholder");
          const placeholder = coverContainer.createDiv("kb-browse-cover-placeholder-icon");
          placeholder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
        };
        img.onload = () => {
          if (img.naturalWidth < 50 || img.naturalHeight < 50) {
            console.log(`[KB Plugin] Cover too small (${img.naturalWidth}x${img.naturalHeight}), showing placeholder for "${book.title}"`);
            coverContainer.empty();
            coverContainer.addClass("kb-browse-cover-placeholder");
            const placeholder = coverContainer.createDiv("kb-browse-cover-placeholder-icon");
            placeholder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
          } else {
            console.log(`[KB Plugin] Cover loaded successfully for "${book.title}" (${img.naturalWidth}x${img.naturalHeight})`);
          }
        };
      } else {
        console.log(`[KB Plugin] No cover URL for "${book.title}"`);
        coverContainer.addClass("kb-browse-cover-placeholder");
        const placeholder = coverContainer.createDiv("kb-browse-cover-placeholder-icon");
        placeholder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
      }
      const info = card.createDiv("kb-browse-info");
      const badgesContainer = info.createDiv("kb-browse-badges");
      const hasLinkedData = book.linkedData && (book.linkedData.creators && book.linkedData.creators.length > 0 || book.linkedData.subjects && book.linkedData.subjects.length > 0 || book.linkedData.series && book.linkedData.series.length > 0);
      if (hasLinkedData) {
        const ldBadge = badgesContainer.createEl("span", {
          text: "LD",
          cls: "kb-badge kb-badge-linked-data"
        });
        ldBadge.setAttribute("title", "Linked data available");
      }
      if (book.authors && book.authors.length > 0) {
        const wBadge = badgesContainer.createEl("span", {
          text: "W",
          cls: "kb-badge kb-badge-wikidata"
        });
        wBadge.setAttribute("title", "Wikidata enrichment available");
      }
      if (book.series) {
        const seriesBadge = badgesContainer.createEl("span", {
          text: "\u{1F4DA}",
          cls: "kb-badge kb-badge-series"
        });
        seriesBadge.setAttribute("title", `Part of series: ${book.series}`);
      }
      info.createEl("h3", { text: book.title, cls: "kb-browse-title" });
      if (book.authors && book.authors.length > 0) {
        const authorContainer = info.createEl("p", {
          cls: "kb-browse-author"
        });
        book.authors.forEach((author, index) => {
          const authorLink = authorContainer.createEl("a", {
            text: author,
            cls: "kb-browse-author-link"
          });
          authorLink.onclick = (e) => {
            e.stopPropagation();
            this.searchByAuthor(author);
          };
          if (index < book.authors.length - 1) {
            authorContainer.appendText(", ");
          }
        });
      }
      const details = [];
      if (book.publisher) details.push(book.publisher);
      if (book.publishYear) details.push(book.publishYear);
      if (details.length > 0) {
        info.createEl("p", {
          text: details.join(" \u2022 "),
          cls: "kb-browse-publisher"
        });
      }
      if (book.description) {
        const desc = book.description.substring(0, 150);
        info.createEl("p", {
          text: desc + (book.description.length > 150 ? "..." : ""),
          cls: "kb-browse-description"
        });
      }
      card.style.cursor = "pointer";
      card.onclick = () => {
        const modal = new BookDetailModal(
          this.plugin,
          book,
          this.apiClient,
          () => {
            this.createdBooks.add(book.isbn || book.title);
            card.addClass("kb-browse-card-created");
          },
          (authorName) => {
            modal.close();
            this.searchByAuthor(authorName);
          },
          (subjects) => {
            modal.close();
            this.searchBySubjects(subjects);
          },
          (uri, type) => {
            modal.close();
            this.searchByLinkedDataUri(uri, type);
          }
        );
        modal.open();
      };
    });
    if (this.hasMoreResults && !this.isLoading) {
      const loadMoreContainer = container.createDiv("kb-browse-load-more");
      const loadMoreBtn = loadMoreContainer.createEl("button", {
        text: "Load More Results",
        cls: "kb-browse-load-more-btn"
      });
      loadMoreBtn.onclick = async () => {
        await this.searchAndDisplay(this.currentQuery, container, true);
      };
    }
    if (this.isLoading) {
      const loadingContainer = container.createDiv("kb-browse-loading");
      loadingContainer.createEl("p", { text: "Loading more results...", cls: "kb-searching" });
    }
  }
  async createBookNote(metadata) {
    try {
      await this.bookNoteCreatorService.createBookNote(metadata, {
        openFile: false,
        // Don't open file in browse view
        runTemplater: false,
        // Don't run templater in browse view
        showNotice: false,
        // Don't show notice (we log instead)
        showCoverSource: false
      });
      console.log(`[KB Plugin] Note created: ${metadata.title}`);
    } catch (error) {
      console.error("[KB Plugin] Error creating book note:", error);
      throw error;
    }
  }
  saveNavigationState() {
    if (this.currentQuery && this.results.length > 0) {
      this.navigationHistory.push({
        query: this.currentQuery,
        results: [...this.results],
        startRecord: this.currentStartRecord,
        hasMoreResults: this.hasMoreResults,
        scrollPosition: this.resultsContainerEl?.scrollTop || 0
      });
    }
  }
  navigateBack() {
    const prevState = this.navigationHistory.pop();
    if (prevState && this.resultsContainerEl) {
      this.currentQuery = prevState.query;
      this.results = prevState.results;
      this.currentStartRecord = prevState.startRecord;
      this.hasMoreResults = prevState.hasMoreResults;
      this.displayResults(this.resultsContainerEl);
      setTimeout(() => {
        if (this.resultsContainerEl) {
          this.resultsContainerEl.scrollTop = prevState.scrollPosition;
        }
      }, 50);
      this.updateBackButtonVisibility();
    }
  }
  updateBackButtonVisibility() {
    const backBtn = this.containerEl.querySelector(".kb-browse-back-btn");
    if (backBtn) {
      backBtn.style.display = this.navigationHistory.length > 0 ? "inline-block" : "none";
    }
  }
  async searchByAuthor(authorName) {
    if (!this.resultsContainerEl) return;
    this.saveNavigationState();
    this.resultsContainerEl.empty();
    this.resultsContainerEl.createEl("p", { text: "Searching...", cls: "kb-searching" });
    await this.searchAndDisplay(authorName, this.resultsContainerEl);
    this.updateBackButtonVisibility();
  }
  async searchBySubjects(subjects) {
    if (!this.resultsContainerEl) return;
    this.saveNavigationState();
    const escapedSubjects = subjects.map((s) => s.replace(/"/g, '\\"'));
    const subjectQuery = escapedSubjects.map((s) => `dc.subject all "${s}"`).join(" AND ");
    console.log("[KB Plugin] Searching by subjects:", subjects);
    console.log("[KB Plugin] CQL Query:", subjectQuery);
    this.resultsContainerEl.empty();
    this.resultsContainerEl.createEl("p", { text: `Searching for books with ${subjects.length} subject${subjects.length > 1 ? "s" : ""}...`, cls: "kb-searching" });
    await this.searchAndDisplay(subjectQuery, this.resultsContainerEl);
    this.updateBackButtonVisibility();
  }
  async searchByLinkedDataUri(uri, type) {
    if (!this.resultsContainerEl) return;
    this.saveNavigationState();
    let query = "";
    const label = uri.split("/").pop() || "Unknown";
    if (type === "creator") {
      query = label;
    } else if (type === "subject") {
      query = label;
    } else if (type === "series") {
      query = label;
    }
    this.resultsContainerEl.empty();
    this.resultsContainerEl.createEl("p", {
      text: `Searching by ${type} URI...`,
      cls: "kb-searching"
    });
    await this.searchAndDisplay(query, this.resultsContainerEl);
    this.updateBackButtonVisibility();
  }
  async onClose() {
    if (this.suggestionsUI) {
      this.suggestionsUI.destroy();
      this.suggestionsUI = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
};

// src/settings.ts
var import_obsidian11 = require("obsidian");
var KBSettingTab = class extends import_obsidian11.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  /**
   * Get all markdown files in the vault
   */
  getMarkdownFiles() {
    return this.app.vault.getMarkdownFiles();
  }
  /**
   * Get all folders in the vault
   */
  getAllFolders() {
    const folders = [""];
    this.app.vault.getAllLoadedFiles().forEach((file) => {
      if (file instanceof import_obsidian11.TFolder) {
        folders.push(file.path);
      }
    });
    return folders.sort();
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "KB Kinderboeken Settings" });
    containerEl.createEl("p", {
      text: "Configure how book notes are created and organized in your vault.",
      cls: "setting-item-description"
    });
    const templateSection = containerEl.createDiv("kb-settings-section");
    templateSection.createEl("h3", { text: "Template Settings" });
    templateSection.createEl("p", {
      text: "Customize how book note content is generated using templates.",
      cls: "kb-settings-description"
    });
    new import_obsidian11.Setting(templateSection).setName("Use template").setDesc("Use a template file for creating book notes").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.useTemplate).onChange(async (value) => {
        this.plugin.settings.useTemplate = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    if (this.plugin.settings.useTemplate) {
      new import_obsidian11.Setting(templateSection).setName("Template file path").setDesc("Select a template file from your vault (leave empty to use default)").addSearch((search) => {
        const markdownFiles = this.getMarkdownFiles();
        search.setPlaceholder("Templates/Book Note.md").setValue(this.plugin.settings.templatePath).onChange(async (value) => {
          this.plugin.settings.templatePath = value;
          await this.plugin.saveSettings();
        });
        search.inputEl.addEventListener("focus", () => {
          search.inputEl.select();
        });
        const suggestions = markdownFiles.map((f) => f.path);
        search.inputEl.addEventListener("input", () => {
          const value = search.getValue().toLowerCase();
          if (value) {
            const matches = suggestions.filter((s) => s.toLowerCase().includes(value));
            if (matches.length > 0) {
              search.inputEl.setAttribute("data-suggestions", matches.slice(0, 10).join(","));
            }
          }
        });
      }).addButton(
        (button) => button.setButtonText("Browse").setTooltip("Select template file").onClick(() => {
          const modal = new TemplateFileModal(this.app, this.getMarkdownFiles(), (file) => {
            this.plugin.settings.templatePath = file.path;
            this.plugin.saveSettings();
            this.display();
          });
          modal.open();
        })
      );
      new import_obsidian11.Setting(templateSection).setName("Filename pattern").setDesc("Pattern for book note filenames. Use {{title}}, {{author}}, {{publishYear}}, etc.").addText(
        (text) => text.setPlaceholder("{{title}}").setValue(this.plugin.settings.filenamePattern).onChange(async (value) => {
          this.plugin.settings.filenamePattern = value || "{{title}}";
          await this.plugin.saveSettings();
        })
      );
      new import_obsidian11.Setting(templateSection).setName("Preview template").setDesc("Preview how your template will look with sample book data").addButton(
        (button) => button.setButtonText("Preview").setTooltip("Open template preview").onClick(async () => {
          const templateEngine = new TemplateEngine();
          const templateReader = new TemplateReader(this.app);
          let templateContent;
          if (this.plugin.settings.templatePath) {
            const customTemplate = await templateReader.readTemplate(
              this.plugin.settings.templatePath
            );
            templateContent = customTemplate || templateReader.getDefaultTemplate();
          } else {
            templateContent = templateReader.getDefaultTemplate();
          }
          const sampleBook = {
            title: "De Gruffalo",
            authors: ["Julia Donaldson", "Axel Scheffler"],
            isbn: "9789025735722",
            publisher: "Lemniscaat",
            publishYear: "2000",
            language: "Dutch",
            description: "Een muis loopt door een donker bos en ontmoet verschillende dieren die hem willen opeten. De muis vertelt dat hij op weg is naar de griezelige Gruffalo.",
            subjects: ["Prentenboeken", "Vriendschap", "Moed"],
            pageCount: "32",
            targetAge: "4-6 jaar",
            series: "",
            coverUrl: "https://example.com/cover.jpg",
            localCoverImage: "attachments/de-gruffalo-cover.jpg",
            identifier: "KB:12345"
          };
          const rendered = templateEngine.render(templateContent, sampleBook);
          const modal = new TemplatePreviewModal(this.app, rendered, this.plugin.settings.templatePath || "Default Template");
          modal.open();
        })
      );
      const helpEl = templateSection.createDiv("kb-template-help");
      helpEl.createEl("p", {
        text: "Available template variables:",
        cls: "setting-item-description"
      });
      const variablesList = helpEl.createEl("ul", {
        cls: "kb-template-variables"
      });
      const variables = [
        "{{title}} - Book title",
        "{{author}} - First author",
        "{{authors}} - All authors (comma-separated)",
        "{{authorsString}} - All authors as string",
        "{{isbn}} - ISBN number",
        "{{publishYear}} - Publication year",
        "{{publisher}} - Publisher name",
        "{{language}} - Language",
        "{{description}} - Book description",
        "{{subjects}} - Subjects (comma-separated)",
        "{{pageCount}} - Number of pages",
        "{{coverUrl}} - Cover image URL",
        "{{localCoverImage}} - Local cover path",
        "{{DATE:YYYY-MM-DD}} - Current date (customizable format)"
      ];
      variables.forEach((v) => {
        variablesList.createEl("li", { text: v });
      });
    }
    const searchSection = containerEl.createDiv("kb-settings-section");
    searchSection.createEl("h3", { text: "Search Preferences" });
    searchSection.createEl("p", {
      text: "Configure how the plugin searches for books in the KB catalog.",
      cls: "kb-settings-description"
    });
    new import_obsidian11.Setting(searchSection).setName("Prioritize children's books").setDesc("When searching, prioritize books with youth/children's literature subjects (Jeugd, Fictie). This helps find more children's books but may miss some adult books with similar titles.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.prioritizeChildrensBooks).onChange(async (value) => {
        this.plugin.settings.prioritizeChildrensBooks = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian11.Setting(searchSection).setName("Use fuzzy search").setDesc("Enable fuzzy matching to find results even with typos or partial matches. Disable for exact matches only.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.useFuzzySearch).onChange(async (value) => {
        this.plugin.settings.useFuzzySearch = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian11.Setting(searchSection).setName("Fetch KB linked data").setDesc("Enrich search results with linked data from data.bibliotheken.nl (subjects, creators, and series URIs). Disable if you want to avoid additional network calls.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableLinkedDataEnrichment).onChange(async (value) => {
        this.plugin.settings.enableLinkedDataEnrichment = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian11.Setting(searchSection).setName("Fetch Wikidata author profiles").setDesc("Enrich author information with Wikidata profiles including photos, birth/death dates, occupation, and Wikipedia links. Similar to Wikipedia's author integration. Requires KB linked data to be enabled.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableWikidataEnrichment).onChange(async (value) => {
        this.plugin.settings.enableWikidataEnrichment = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian11.Setting(searchSection).setName("Enrich metadata from Bol.com").setDesc("Automatically fetch additional metadata (series, page count, better descriptions) from Bol.com when available. This may slightly slow down searches but provides richer information.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enrichFromBol).onChange(async (value) => {
        this.plugin.settings.enrichFromBol = value;
        await this.plugin.saveSettings();
      })
    );
    const fileSection = containerEl.createDiv("kb-settings-section");
    fileSection.createEl("h3", { text: "File & Folder Settings" });
    fileSection.createEl("p", {
      text: "Configure where book notes and cover images are stored in your vault.",
      cls: "kb-settings-description"
    });
    new import_obsidian11.Setting(fileSection).setName("Book notes folder").setDesc("Folder where book notes will be created.").addText(
      (text) => text.setPlaceholder("Books").setValue(this.plugin.settings.bookNotesFolder).onChange(async (value) => {
        this.plugin.settings.bookNotesFolder = value || "Books";
        await this.plugin.saveSettings();
      })
    ).addButton(
      (button) => button.setButtonText("Browse").setTooltip("Select folder").onClick(() => {
        const modal = new FolderSuggestModal(this.app, this.getAllFolders(), (folder) => {
          this.plugin.settings.bookNotesFolder = folder || "Books";
          this.plugin.saveSettings();
          this.display();
        });
        modal.open();
      })
    );
    new import_obsidian11.Setting(fileSection).setName("Download cover images").setDesc("Download and store book covers locally in your vault").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.downloadCovers).onChange(async (value) => {
        this.plugin.settings.downloadCovers = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    if (this.plugin.settings.downloadCovers) {
      new import_obsidian11.Setting(fileSection).setName("Cover filename pattern").setDesc("Pattern for cover filenames. Use {{title}}, {{isbn}}, {{author}}, etc.").addText(
        (text) => text.setPlaceholder("{{title}}-cover").setValue(this.plugin.settings.coverFilenamePattern).onChange(async (value) => {
          this.plugin.settings.coverFilenamePattern = value || "{{title}}-cover";
          await this.plugin.saveSettings();
        })
      );
      new import_obsidian11.Setting(fileSection).setName("Deduplicate covers").setDesc("Skip downloading if a cover with the same filename already exists").addToggle(
        (toggle) => toggle.setValue(this.plugin.settings.deduplicateCovers).onChange(async (value) => {
          this.plugin.settings.deduplicateCovers = value;
          await this.plugin.saveSettings();
        })
      );
      new import_obsidian11.Setting(fileSection).setName("Cover fallback URL").setDesc("URL or path to use when no cover is available (leave empty for no fallback)").addText(
        (text) => text.setPlaceholder("https://example.com/placeholder.jpg").setValue(this.plugin.settings.coverFallbackUrl).onChange(async (value) => {
          this.plugin.settings.coverFallbackUrl = value;
          await this.plugin.saveSettings();
        })
      );
    }
    new import_obsidian11.Setting(fileSection).setName("Attachment folder").setDesc("Folder where cover images will be saved (relative to vault root)").addText(
      (text) => text.setPlaceholder("attachments").setValue(this.plugin.settings.attachmentFolder).onChange(async (value) => {
        this.plugin.settings.attachmentFolder = value || "attachments";
        await this.plugin.saveSettings();
      })
    ).addButton(
      (button) => button.setButtonText("Browse").setTooltip("Select folder").onClick(() => {
        const modal = new FolderSuggestModal(this.app, this.getAllFolders(), (folder) => {
          this.plugin.settings.attachmentFolder = folder || "attachments";
          this.plugin.saveSettings();
          this.display();
        });
        modal.open();
      })
    );
    new import_obsidian11.Setting(fileSection).setName("Default author").setDesc("Default author name to use when metadata doesn't include an author").addText(
      (text) => text.setPlaceholder("Unknown Author").setValue(this.plugin.settings.defaultAuthor).onChange(async (value) => {
        this.plugin.settings.defaultAuthor = value;
        await this.plugin.saveSettings();
      })
    );
    const amazonSection = containerEl.createDiv("kb-settings-section");
    amazonSection.createEl("h3", { text: "Amazon Cover Settings" });
    amazonSection.createEl("p", {
      text: "Configure Amazon as an additional cover source (used as fallback after Open Library and Google Books).",
      cls: "kb-settings-description"
    });
    new import_obsidian11.Setting(amazonSection).setName("Amazon region").setDesc("Select which Amazon region to use for cover images").addDropdown(
      (dropdown) => dropdown.addOption("nl", "Netherlands (Amazon.nl)").addOption("de", "Germany (Amazon.de)").addOption("uk", "United Kingdom (Amazon.co.uk)").addOption("us", "United States (Amazon.com)").addOption("fr", "France (Amazon.fr)").setValue(this.plugin.settings.amazonRegion).onChange(async (value) => {
        this.plugin.settings.amazonRegion = value;
        await this.plugin.saveSettings();
      })
    );
  }
};
var TemplateFileModal = class extends import_obsidian11.FuzzySuggestModal {
  constructor(app, files, onSelect) {
    super(app);
    this.files = files;
    this.onSelect = onSelect;
    this.setPlaceholder("Search for a template file...");
  }
  getItems() {
    return this.files;
  }
  getItemText(file) {
    return file.path;
  }
  onChooseItem(file) {
    this.onSelect(file);
  }
};
var FolderSuggestModal = class extends import_obsidian11.FuzzySuggestModal {
  constructor(app, folders, onSelect) {
    super(app);
    this.folders = folders;
    this.onSelect = onSelect;
    this.setPlaceholder("Search for a folder...");
  }
  getItems() {
    return this.folders;
  }
  getItemText(folder) {
    return folder || "(root)";
  }
  onChooseItem(folder) {
    this.onSelect(folder);
  }
};
var TemplatePreviewModal = class extends import_obsidian11.Modal {
  constructor(app, content, templateName) {
    super(app);
    this.content = content;
    this.templateName = templateName;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("kb-template-preview-modal");
    contentEl.createEl("h2", { text: `Template Preview: ${this.templateName}` });
    contentEl.createEl("p", {
      text: "This is how your template will look with sample book data:",
      cls: "kb-preview-description"
    });
    const previewContainer = contentEl.createDiv("kb-preview-container");
    const preEl = previewContainer.createEl("pre", { cls: "kb-preview-content" });
    const codeEl = preEl.createEl("code");
    codeEl.textContent = this.content;
    const buttonContainer = contentEl.createDiv("kb-preview-buttons");
    const copyButton = buttonContainer.createEl("button", { text: "Copy to Clipboard" });
    copyButton.onclick = async () => {
      await navigator.clipboard.writeText(this.content);
      copyButton.textContent = "Copied!";
      setTimeout(() => {
        copyButton.textContent = "Copy to Clipboard";
      }, 2e3);
    };
    const closeButton = buttonContainer.createEl("button", { text: "Close" });
    closeButton.onclick = () => this.close();
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};

// src/types.ts
var DEFAULT_SETTINGS = {
  attachmentFolder: "attachments",
  downloadCovers: true,
  defaultAuthor: "",
  bookNotesFolder: "Books",
  templatePath: "",
  filenamePattern: "{{title}}",
  useTemplate: true,
  coverFilenamePattern: "{{title}}-cover",
  deduplicateCovers: true,
  coverFallbackUrl: "",
  // Children's book search preferences
  prioritizeChildrensBooks: false,
  // Default to general search
  // Search behavior
  useFuzzySearch: true,
  // Enable fuzzy matching by default for better results
  enableLinkedDataEnrichment: true,
  enableWikidataEnrichment: true,
  // Enable Wikidata author profiles by default
  // Bol.com integration
  enrichFromBol: true,
  // Enable metadata enrichment by default
  // Amazon Product Advertising API
  amazonAccessKey: "",
  amazonSecretKey: "",
  amazonAssociateTag: "",
  amazonRegion: "nl"
  // Netherlands by default
};

// src/main.ts
var KBKinderboekenPlugin = class extends import_obsidian12.Plugin {
  async onload() {
    console.log("[KB Plugin] Loading KB Kinderboeken plugin");
    await this.loadSettings();
    console.log("[KB Plugin] Settings loaded");
    this.registerView(
      VIEW_TYPE_KB_BROWSE,
      (leaf) => new KBBrowseView(leaf, this)
    );
    this.addRibbonIcon("book", "Search KB Kinderboeken", () => {
      try {
        console.log("[KB Plugin] Opening modal from ribbon");
        new BookSearchModal(this.app, this).open();
      } catch (error) {
        console.error("[KB Plugin] Error opening modal from ribbon:", error);
      }
    });
    this.addCommand({
      id: "search-kb-kinderboeken",
      name: "Search for book",
      callback: () => {
        try {
          console.log("[KB Plugin] Opening modal from command");
          new BookSearchModal(this.app, this).open();
        } catch (error) {
          console.error("[KB Plugin] Error opening modal from command:", error);
        }
      }
    });
    this.addCommand({
      id: "search-kb-kinderboeken-selection",
      name: "Search for selected text",
      editorCallback: (editor) => {
        try {
          const selection = editor.getSelection();
          console.log("[KB Plugin] Opening modal with selection:", selection ? "yes" : "no");
          if (selection) {
            new BookSearchModal(this.app, this, selection).open();
          } else {
            new BookSearchModal(this.app, this).open();
          }
        } catch (error) {
          console.error("[KB Plugin] Error opening modal from selection:", error);
        }
      }
    });
    this.addCommand({
      id: "search-kb-kinderboeken-isbn",
      name: "Search by ISBN",
      callback: () => {
        try {
          console.log("[KB Plugin] Opening ISBN search modal");
          new BookSearchModal(this.app, this).open();
        } catch (error) {
          console.error("[KB Plugin] Error opening ISBN modal:", error);
        }
      }
    });
    this.addCommand({
      id: "advanced-search-kb-kinderboeken",
      name: "Advanced search for books",
      callback: () => {
        try {
          console.log("[KB Plugin] Opening advanced search modal");
          new AdvancedSearchModal(this.app, this).open();
        } catch (error) {
          console.error("[KB Plugin] Error opening advanced search modal:", error);
        }
      }
    });
    this.addCommand({
      id: "browse-explore-kb-kinderboeken",
      name: "Browse & explore books",
      callback: async () => {
        try {
          console.log("[KB Plugin] Opening browse & explore view");
          await this.activateBrowseView();
        } catch (error) {
          console.error("[KB Plugin] Error opening browse & explore view:", error);
        }
      }
    });
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        try {
          const selection = editor.getSelection();
          if (selection) {
            menu.addItem((item) => {
              item.setTitle("Search KB for book").setIcon("book").onClick(() => {
                try {
                  console.log("[KB Plugin] Opening modal from context menu");
                  new BookSearchModal(this.app, this, selection).open();
                } catch (error) {
                  console.error("[KB Plugin] Error in context menu click:", error);
                }
              });
            });
          }
        } catch (error) {
          console.error("[KB Plugin] Error adding context menu:", error);
        }
      })
    );
    this.addSettingTab(new KBSettingTab(this.app, this));
  }
  async activateBrowseView() {
    const { workspace } = this.app;
    let leaf = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_KB_BROWSE);
    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({
        type: VIEW_TYPE_KB_BROWSE,
        active: true
      });
    }
    workspace.revealLeaf(leaf);
  }
  onunload() {
    console.log("Unloading KB Kinderboeken plugin");
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_KB_BROWSE);
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
//# sourceMappingURL=main.js.map