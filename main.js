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
    var XMLParser2 = class {
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
    module2.exports = XMLParser2;
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
    var XMLParser2 = require_XMLParser();
    var XMLBuilder = require_json2xml();
    module2.exports = {
      XMLParser: XMLParser2,
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
var import_obsidian5 = require("obsidian");

// src/modal.ts
var import_obsidian3 = require("obsidian");

// src/api.ts
var import_fast_xml_parser = __toESM(require_fxp());
var import_obsidian = require("obsidian");
var KB_SRU_BASE_URL = "https://jsru.kb.nl/sru/sru";
var KB_COLLECTION = "GGC";
var KBApiClient = class {
  // 10 minutes
  constructor(prioritizeChildrensBooks = false, useFuzzySearch = true) {
    this.prioritizeChildrensBooks = false;
    this.useFuzzySearch = true;
    this.searchCache = /* @__PURE__ */ new Map();
    this.CACHE_TTL = 10 * 60 * 1e3;
    this.parser = new import_fast_xml_parser.XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseTagValue: false,
      trimValues: true
    });
    this.prioritizeChildrensBooks = prioritizeChildrensBooks;
    this.useFuzzySearch = useFuzzySearch;
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
   * Search for books by title or author with improved query construction
   */
  async searchBooks(query, maxResults = 10) {
    try {
      const cacheKey = `${query}:${maxResults}:${this.prioritizeChildrensBooks}`;
      const cached = this.searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log("[KB Plugin] Returning cached results for:", query);
        return cached.results;
      }
      console.log("[KB Plugin] Searching for:", query, this.prioritizeChildrensBooks ? "(prioritizing children's books)" : "");
      let searchQuery = this.buildSearchQuery(query);
      const encodedQuery = encodeURIComponent(searchQuery);
      const url = `${KB_SRU_BASE_URL}?x-collection=${KB_COLLECTION}&version=1.2&operation=searchRetrieve&query=${encodedQuery}&maximumRecords=${maxResults}&x-fields=ISBN`;
      const results = await this.performSearch(url);
      if (this.prioritizeChildrensBooks && results.length < 3) {
        console.log("[KB Plugin] Few children's book results, also trying general search...");
        const generalQuery = this.buildSearchQuery(query, false);
        const generalUrl = `${KB_SRU_BASE_URL}?x-collection=${KB_COLLECTION}&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(generalQuery)}&maximumRecords=${maxResults - results.length}&x-fields=ISBN`;
        const generalResults = await this.performSearch(generalUrl);
        const existingISBNs = new Set(results.map((r) => r.isbn));
        const additionalResults = generalResults.filter((r) => !existingISBNs.has(r.isbn));
        results.push(...additionalResults.slice(0, maxResults - results.length));
      }
      this.searchCache.set(cacheKey, { results, timestamp: Date.now() });
      return results;
    } catch (error) {
      console.error("[KB Plugin] Search error:", error);
      new import_obsidian.Notice("Search failed. Please check your internet connection.");
      return [];
    }
  }
  /**
   * Build intelligent search query with proper operators
   */
  buildSearchQuery(query, useChildrensFilter = this.prioritizeChildrensBooks) {
    const trimmedQuery = query.trim();
    const titleWords = /\b(de|het|een|van|voor|kleine|grote|people|dreams|klein|groots)\b/i;
    const words = trimmedQuery.split(/\s+/);
    const isLikelyAuthor = /^[A-Z][a-z]+,\s*[A-Z]/.test(trimmedQuery) || // "Lastname, Firstname" format
    words.length === 2 && // Exactly 2 words
    /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(trimmedQuery) && // Both capitalized
    !titleWords.test(trimmedQuery);
    const isLikelySeries = trimmedQuery.includes('"') || /\b(serie|reeks|verzameling)\b/i.test(trimmedQuery);
    let baseQuery;
    if (isLikelyAuthor) {
      if (this.useFuzzySearch) {
        baseQuery = `dc.creator="${trimmedQuery}" OR dc.creator all "${trimmedQuery}"`;
      } else {
        baseQuery = `dc.creator="${trimmedQuery}"`;
      }
    } else if (isLikelySeries) {
      const seriesName = trimmedQuery.replace(/\b(serie|reeks|verzameling)\b/gi, "").replace(/"/g, "").trim();
      baseQuery = `dc.title all "${seriesName}" OR dc.relation all "${seriesName}"`;
    } else {
      baseQuery = `"${trimmedQuery}"`;
    }
    if (useChildrensFilter) {
      return `(${baseQuery}) AND (dc.subject=Jeugd OR dc.subject="Jeugdliteratuur" OR dc.subject="Prentenboeken")`;
    }
    return baseQuery;
  }
  /**
   * Search for a book by ISBN
   */
  async searchByISBN(isbn) {
    try {
      console.log("[KB Plugin] Searching by ISBN:", isbn);
      const cleanISBN = isbn.replace(/[^0-9X]/gi, "");
      if (!cleanISBN) {
        new import_obsidian.Notice("Invalid ISBN format");
        return null;
      }
      const url = `${KB_SRU_BASE_URL}?x-collection=${KB_COLLECTION}&version=1.2&operation=searchRetrieve&query=ISBN=${cleanISBN}&maximumRecords=1&x-fields=ISBN`;
      const results = await this.performSearch(url);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error("[KB Plugin] ISBN search error:", error);
      new import_obsidian.Notice("ISBN search failed. Please try again.");
      return null;
    }
  }
  async performSearch(url) {
    try {
      console.log("[KB Plugin] API URL:", url);
      const response = await (0, import_obsidian.requestUrl)({
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
        new import_obsidian.Notice("Received empty response from KB API");
        return [];
      }
      console.log("[KB Plugin] Response length:", xmlText.length);
      const parsed = this.parser.parse(xmlText);
      if (!parsed) {
        console.error("[KB Plugin] Failed to parse XML");
        return [];
      }
      return this.parseSearchResults(parsed);
    } catch (error) {
      console.error("[KB Plugin] API error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      new import_obsidian.Notice(`API error: ${errorMessage}`);
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
        identifier: this.extractField(dc, "dc:identifier"),
        coverUrl: primaryIsbn ? `https://covers.openlibrary.org/b/isbn/${primaryIsbn}-L.jpg` : void 0
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
      const response = await (0, import_obsidian.requestUrl)({
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
      const response = await (0, import_obsidian.requestUrl)({
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
        return {
          ...metadata,
          series: metadata.series || bolMetadata.series,
          description: metadata.description || bolMetadata.description,
          pageCount: metadata.pageCount || bolMetadata.pageCount,
          coverUrl: bolMetadata.coverUrl || metadata.coverUrl
        };
      }
    } catch (error) {
      console.error("[KB Plugin] Error enriching from Bol.com:", error);
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
      const response = await (0, import_obsidian.requestUrl)({
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
      const productResponse = await (0, import_obsidian.requestUrl)({
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
      const response = await (0, import_obsidian.requestUrl)({
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
      const productResponse = await (0, import_obsidian.requestUrl)({
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
      const response = await (0, import_obsidian.requestUrl)({
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
          const productResponse = await (0, import_obsidian.requestUrl)({
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
      const response = await (0, import_obsidian.requestUrl)({
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
    result = this.replacePlaceholders(result, data);
    result = this.processDateHelpers(result);
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
        return `[Script Error: ${error.message}]`;
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
var import_obsidian2 = require("obsidian");
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
      if (!file || !(file instanceof import_obsidian2.TFile)) {
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
    return file instanceof import_obsidian2.TFile;
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

// src/modal.ts
var BookSearchModal = class extends import_obsidian3.Modal {
  constructor(app, plugin, initialQuery = "") {
    super(app);
    this.results = [];
    this.selectedBook = null;
    this.plugin = plugin;
    this.apiClient = new KBApiClient(plugin.settings.prioritizeChildrensBooks, plugin.settings.useFuzzySearch);
    this.templateEngine = new TemplateEngine();
    this.templateReader = new TemplateReader(app);
    this.initialQuery = initialQuery;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("kb-kinderboeken-modal");
    contentEl.createEl("h2", { text: "Search KB Kinderboeken" });
    const searchTypeContainer = contentEl.createDiv("kb-search-type");
    let searchType = "general";
    new import_obsidian3.Setting(searchTypeContainer).setName("Search by").addDropdown(
      (dropdown) => dropdown.addOption("general", "Title/Author").addOption("isbn", "ISBN").setValue("general").onChange((value) => {
        searchType = value;
        searchInput.setPlaceholder(
          searchType === "isbn" ? "Enter ISBN (e.g., 9780123456789)" : "Enter book title or author name"
        );
      })
    );
    const searchContainer = contentEl.createDiv("kb-search-container");
    let searchInput;
    const performSearch = async () => {
      const query = searchInput.getValue().trim();
      if (!query) {
        new import_obsidian3.Notice("Please enter a search query");
        return;
      }
      resultsContainer.empty();
      resultsContainer.createEl("p", { text: "Searching..." });
      if (searchType === "isbn") {
        await this.searchByISBN(query, resultsContainer);
      } else {
        await this.searchByQuery(query, resultsContainer);
      }
    };
    new import_obsidian3.Setting(searchContainer).setName("Search").addText((text) => {
      searchInput = text;
      text.setPlaceholder("Enter book title or author name").setValue(this.initialQuery).onChange(() => {
      });
      text.inputEl.addEventListener("keydown", async (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          await performSearch();
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
          new import_obsidian3.Notice("Failed to insert metadata. Check console for details.");
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
      console.log("[KB Plugin] Creating note for:", this.selectedBook.title);
      const metadata = this.selectedBook;
      if (this.plugin.settings.downloadCovers && metadata.coverUrl) {
        const coverPath = await this.downloadAndAttachCover(metadata);
        if (coverPath) {
          metadata.localCoverImage = coverPath;
        }
      }
      const filename = this.templateEngine.renderFilename(
        this.plugin.settings.filenamePattern,
        metadata
      );
      const folderPath = this.plugin.settings.bookNotesFolder;
      const folderExists = await this.app.vault.adapter.exists(folderPath);
      if (!folderExists) {
        console.log("[KB Plugin] Creating folder:", folderPath);
        await this.app.vault.createFolder(folderPath);
      }
      const filePath = `${folderPath}/${filename}.md`;
      const fileExists = await this.app.vault.adapter.exists(filePath);
      let templateContent;
      if (this.plugin.settings.useTemplate && this.plugin.settings.templatePath) {
        const customTemplate = await this.templateReader.readTemplate(
          this.plugin.settings.templatePath
        );
        templateContent = customTemplate || this.templateReader.getDefaultTemplate();
      } else {
        templateContent = this.templateReader.getDefaultTemplate();
      }
      const renderedContent = this.templateEngine.render(templateContent, metadata);
      let file = null;
      if (fileExists) {
        const abstractFile = this.app.vault.getAbstractFileByPath(filePath);
        if (abstractFile instanceof import_obsidian3.TFile) {
          console.log("[KB Plugin] Updating existing note:", filePath);
          await this.app.vault.modify(abstractFile, renderedContent);
          file = abstractFile;
        }
      } else {
        console.log("[KB Plugin] Creating new note:", filePath);
        file = await this.app.vault.create(filePath, renderedContent);
      }
      if (file) {
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file);
        await this.runTemplaterIfAvailable(file);
      }
      new import_obsidian3.Notice(`Book note created: ${filename}`);
    } catch (error) {
      console.error("[KB Plugin] Error creating book note:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      new import_obsidian3.Notice(`Error creating book note: ${errorMessage}`);
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
    const triedAmazon = false;
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
      } else if (!triedAmazon) {
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
  async downloadAndAttachCover(metadata) {
    if (!metadata.coverUrl) {
      return this.getCoverFallback();
    }
    try {
      const folder = this.plugin.settings.attachmentFolder;
      const fileName = this.templateEngine.renderFilename(
        this.plugin.settings.coverFilenamePattern,
        metadata
      );
      const filePath = `${folder}/${fileName}.jpg`;
      if (this.plugin.settings.deduplicateCovers) {
        const exists = await this.app.vault.adapter.exists(filePath);
        if (exists) {
          console.log(`[KB Plugin] Cover already exists: ${filePath}`);
          return filePath;
        }
      }
      const isbnsToTry = metadata.allIsbns && metadata.allIsbns.length > 0 ? metadata.allIsbns : [metadata.isbn].filter(Boolean);
      let coverData = null;
      let successfulIsbn = null;
      for (const isbn of isbnsToTry) {
        const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
        console.log(`[KB Plugin] Trying Open Library: ${coverUrl}`);
        coverData = await this.apiClient.downloadCover(coverUrl);
        if (coverData && coverData.byteLength > 1e3) {
          console.log(`[KB Plugin] Found Open Library cover with ISBN: ${isbn} (${coverData.byteLength} bytes)`);
          successfulIsbn = isbn;
          break;
        } else {
          console.log(`[KB Plugin] No valid Open Library cover for ISBN: ${isbn}`);
        }
      }
      if (!coverData || !successfulIsbn) {
        console.log("[KB Plugin] Trying Google Books as fallback...");
        for (const isbn of isbnsToTry) {
          const googleCoverUrl = await this.apiClient.getGoogleBooksCover(isbn);
          if (googleCoverUrl) {
            console.log(`[KB Plugin] Found Google Books cover URL for ISBN: ${isbn}`);
            coverData = await this.apiClient.downloadCover(googleCoverUrl);
            if (coverData && coverData.byteLength > 1e3) {
              console.log(`[KB Plugin] Successfully downloaded Google Books cover (${coverData.byteLength} bytes)`);
              successfulIsbn = isbn;
              break;
            }
          }
        }
      }
      if (!coverData || !successfulIsbn) {
        console.log("[KB Plugin] Trying Amazon as fallback...");
        for (const isbn of isbnsToTry) {
          const amazonCoverUrl = this.apiClient.getAmazonCoverUrl(isbn, this.plugin.settings.amazonRegion);
          console.log(`[KB Plugin] Trying Amazon cover URL for ISBN: ${isbn}`);
          coverData = await this.apiClient.downloadCover(amazonCoverUrl);
          if (coverData && coverData.byteLength > 1e3) {
            console.log(`[KB Plugin] Successfully downloaded Amazon cover (${coverData.byteLength} bytes)`);
            successfulIsbn = isbn;
            break;
          }
        }
      }
      if (!coverData || !successfulIsbn) {
        console.log("[KB Plugin] Trying Bol.com as fallback...");
        for (const isbn of isbnsToTry) {
          const bolCoverUrl = await this.apiClient.getBolCoverUrl(isbn);
          if (bolCoverUrl) {
            console.log(`[KB Plugin] Found Bol.com cover URL for ISBN: ${isbn}`);
            coverData = await this.apiClient.downloadCover(bolCoverUrl);
            if (coverData && coverData.byteLength > 1e3) {
              console.log(`[KB Plugin] Successfully downloaded Bol.com cover (${coverData.byteLength} bytes)`);
              successfulIsbn = isbn;
              break;
            }
          }
        }
      }
      if (!coverData || !successfulIsbn) {
        console.log("[KB Plugin] No cover found from any source");
        return this.getCoverFallback();
      }
      const folderExists = await this.app.vault.adapter.exists(folder);
      if (!folderExists) {
        await this.app.vault.createFolder(folder);
      }
      await this.app.vault.adapter.writeBinary(filePath, coverData);
      console.log(`[KB Plugin] Cover image saved to ${filePath}`);
      return filePath;
    } catch (error) {
      console.error("[KB Plugin] Error downloading cover:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      new import_obsidian3.Notice(`Could not save cover image: ${errorMessage}`);
      return this.getCoverFallback();
    }
  }
  /**
   * Get fallback cover path/URL
   */
  getCoverFallback() {
    const fallback = this.plugin.settings.coverFallbackUrl;
    return fallback ? fallback : null;
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};

// src/settings.ts
var import_obsidian4 = require("obsidian");
var KBSettingTab = class extends import_obsidian4.PluginSettingTab {
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
      if (file instanceof import_obsidian4.TFolder) {
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
    new import_obsidian4.Setting(templateSection).setName("Use template").setDesc("Use a template file for creating book notes").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.useTemplate).onChange(async (value) => {
        this.plugin.settings.useTemplate = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    if (this.plugin.settings.useTemplate) {
      new import_obsidian4.Setting(templateSection).setName("Template file path").setDesc("Select a template file from your vault (leave empty to use default)").addSearch((search) => {
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
      new import_obsidian4.Setting(templateSection).setName("Filename pattern").setDesc("Pattern for book note filenames. Use {{title}}, {{author}}, {{publishYear}}, etc.").addText(
        (text) => text.setPlaceholder("{{title}}").setValue(this.plugin.settings.filenamePattern).onChange(async (value) => {
          this.plugin.settings.filenamePattern = value || "{{title}}";
          await this.plugin.saveSettings();
        })
      );
      new import_obsidian4.Setting(templateSection).setName("Preview template").setDesc("Preview how your template will look with sample book data").addButton(
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
    new import_obsidian4.Setting(searchSection).setName("Prioritize children's books").setDesc("When searching, prioritize books with youth/children's literature subjects (Jeugd, Fictie). This helps find more children's books but may miss some adult books with similar titles.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.prioritizeChildrensBooks).onChange(async (value) => {
        this.plugin.settings.prioritizeChildrensBooks = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian4.Setting(searchSection).setName("Use fuzzy search").setDesc("Enable fuzzy matching to find results even with typos or partial matches. Disable for exact matches only.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.useFuzzySearch).onChange(async (value) => {
        this.plugin.settings.useFuzzySearch = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian4.Setting(searchSection).setName("Enrich metadata from Bol.com").setDesc("Automatically fetch additional metadata (series, page count, better descriptions) from Bol.com when available. This may slightly slow down searches but provides richer information.").addToggle(
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
    new import_obsidian4.Setting(fileSection).setName("Book notes folder").setDesc("Folder where book notes will be created.").addText(
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
    new import_obsidian4.Setting(fileSection).setName("Download cover images").setDesc("Download and store book covers locally in your vault").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.downloadCovers).onChange(async (value) => {
        this.plugin.settings.downloadCovers = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    if (this.plugin.settings.downloadCovers) {
      new import_obsidian4.Setting(fileSection).setName("Cover filename pattern").setDesc("Pattern for cover filenames. Use {{title}}, {{isbn}}, {{author}}, etc.").addText(
        (text) => text.setPlaceholder("{{title}}-cover").setValue(this.plugin.settings.coverFilenamePattern).onChange(async (value) => {
          this.plugin.settings.coverFilenamePattern = value || "{{title}}-cover";
          await this.plugin.saveSettings();
        })
      );
      new import_obsidian4.Setting(fileSection).setName("Deduplicate covers").setDesc("Skip downloading if a cover with the same filename already exists").addToggle(
        (toggle) => toggle.setValue(this.plugin.settings.deduplicateCovers).onChange(async (value) => {
          this.plugin.settings.deduplicateCovers = value;
          await this.plugin.saveSettings();
        })
      );
      new import_obsidian4.Setting(fileSection).setName("Cover fallback URL").setDesc("URL or path to use when no cover is available (leave empty for no fallback)").addText(
        (text) => text.setPlaceholder("https://example.com/placeholder.jpg").setValue(this.plugin.settings.coverFallbackUrl).onChange(async (value) => {
          this.plugin.settings.coverFallbackUrl = value;
          await this.plugin.saveSettings();
        })
      );
    }
    new import_obsidian4.Setting(fileSection).setName("Attachment folder").setDesc("Folder where cover images will be saved (relative to vault root)").addText(
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
    new import_obsidian4.Setting(fileSection).setName("Default author").setDesc("Default author name to use when metadata doesn't include an author").addText(
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
    new import_obsidian4.Setting(amazonSection).setName("Amazon region").setDesc("Select which Amazon region to use for cover images").addDropdown(
      (dropdown) => dropdown.addOption("nl", "Netherlands (Amazon.nl)").addOption("de", "Germany (Amazon.de)").addOption("uk", "United Kingdom (Amazon.co.uk)").addOption("us", "United States (Amazon.com)").addOption("fr", "France (Amazon.fr)").setValue(this.plugin.settings.amazonRegion).onChange(async (value) => {
        this.plugin.settings.amazonRegion = value;
        await this.plugin.saveSettings();
      })
    );
  }
};
var TemplateFileModal = class extends import_obsidian4.FuzzySuggestModal {
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
var FolderSuggestModal = class extends import_obsidian4.FuzzySuggestModal {
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
var TemplatePreviewModal = class extends import_obsidian4.Modal {
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
var KBKinderboekenPlugin = class extends import_obsidian5.Plugin {
  async onload() {
    console.log("[KB Plugin] Loading KB Kinderboeken plugin v0.1.0");
    await this.loadSettings();
    console.log("[KB Plugin] Settings loaded");
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
  onunload() {
    console.log("Unloading KB Kinderboeken plugin");
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
//# sourceMappingURL=main.js.map