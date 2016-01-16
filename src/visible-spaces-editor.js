(function(global, factory) {
	'use strict';
	global.VisibleSpacesEditor = global.VisibleSpacesEditor || factory();

	global.visiblespaces = global.visiblespaces || {
		edit: function(contenteditableElement) {
			return new global.VisibleSpacesEditor(contenteditableElement);
		},
	};
})(this, function() {
	'use strict';
	var CONSTS = {
		CLASSNAME_VISIBLE_SPACE: 'vse-visible-space-box',
		CLASSNAME_SINGLE: 'vse-visible-space-box-singlebyte',
		CLASSNAME_MULTI: 'vse-visible-space-box-multibyte',
		CLASSNAME_TAB: 'vse-visible-space-box-tabchar',
	};
	var bindCall = function(fn) {
		return fn.call.bind(fn);
	};
	var forEach = bindCall(Array.prototype.forEach);
	var some = bindCall(Array.prototype.some);
	var findIndex = bindCall(Array.prototype.findIndex);
	function isTextNode(node) {
		return document.TEXT_NODE === node.nodeType;
	}
	function isElementNode(node) {
		return document.ELEMENT_NODE === node.nodeType;
	}
	function isVisibleSpaceSpan(node) {
		return node.classList.contains(CONSTS.CLASSNAME_VISIBLE_SPACE) && node.tagName === 'SPAN';
	}
	function isSpaceChar(c) {
		return c === ' ' || c === '　' || c === '\t' || c === '\u00A0';
	}
	function getSpaceCharClassName(c) {
		switch (c) {
		case ' ' :
		case '\u00A0' :
			return CONSTS.CLASSNAME_SINGLE;
		case '　' :
			return CONSTS.CLASSNAME_MULTI;
		case '\t' :
			return CONSTS.CLASSNAME_TAB;
		}
		return '';
	}
	function getSpaceCharIndex(text) {
		return findIndex(text, isSpaceChar);
	}
	function incSpaceCharIndex(text) {
		return getSpaceCharIndex(text) > -1;
	}
	function hasVisibleTransformTarget(node) {
		if (isTextNode(node)) {
			//chech add space-class taget
			return incSpaceCharIndex(node.textContent);
		} else if (isElementNode(node)) {
			//check remove space-class target
			if (isVisibleSpaceSpan(node)) {
				return !isSpaceChar(node.innerText);
			}
			return some(node.childNodes, hasVisibleTransformTarget);
		}
		return false;
	}
	function removeHighlight(node) {
		var parent = node.parentElement;
		if (parent === null) {
			return null;
		}
		var text = node.innerText;
		if (text === '\n') {
			parent.insertBefore(document.createElement('br'), node);
			parent.removeChild(node);
			return null;
		} else {
			var textNode = document.createTextNode(text);
			parent.insertBefore(textNode, node);
			parent.removeChild(node);
			return textNode;
		}
	}
	function highlight(textNode) {
		var nodeText = textNode.textContent;
		var index = getSpaceCharIndex(nodeText);
		if (index > -1) {
			var parent = textNode.parentElement;
			if (isSpaceChar(nodeText) && isVisibleSpaceSpan(parent)) {
				return false;
			}
			while (index > -1) {
				var span = document.createElement('span');
				span.classList.add(CONSTS.CLASSNAME_VISIBLE_SPACE, getSpaceCharClassName(nodeText[index]));
				span.textContent = nodeText.substr(index, 1);

				parent.insertBefore(document.createTextNode(nodeText.substr(0, index)), textNode);
				parent.insertBefore(span, textNode);
				nodeText = nodeText.substr(index + 1);
				index = getSpaceCharIndex(nodeText);
			}
			if (nodeText) {
				parent.insertBefore(document.createTextNode(nodeText), textNode);
			}
			parent.removeChild(textNode);
			return true;
		} else {
			return false;
		}
	}
	function refreshHighlight(node) {
		var parentModFlg = false;

		if (isTextNode(node)) {
			//add space-class target
			highlight(node);
		} else if (isElementNode(node)) {
			//remove space-class target
			if (isVisibleSpaceSpan(node)) {
				if (isSpaceChar(node.innerText)) {
					return false;
				}
				var textNode = removeHighlight(node);
				if (textNode) {
					highlight(textNode);
				}
				return true;
			} else {
				var normalizeFlg = false;
				forEach(node.childNodes, function(c) {
					normalizeFlg = refreshHighlight(c) || normalizeFlg;
				});
				if (normalizeFlg) {
					node.normalize();
				}
			}
		}
		return parentModFlg;
	}
	function getTextLength(node) {
		var text = node.innerText || node.textContent;
		var length = text.length;
		if (length > 0 && text[length - 1] === '\n') {
			return length;
		} else if (node.tagName === 'DIV') {
			return length + 1;
		} else {
			var next = node.nextSibling;
			if (next && next.tagName === 'DIV') {
				return length + 1;
			}
		}
		return length;
	}
	function getTextOffset(node, baseNode) {
		if (node === null) {
			return 0;
		}
		if (node === baseNode) {
			return 0;
		}
		var offset = 0;
		var prev = node.previousSibling;
		while (prev) {
			offset += getTextLength(prev);
			prev = prev.previousSibling;
		}
		return offset + getTextOffset(node.parentElement, baseNode);
	}
	function getCaret(node, offset, baseNode) {
		if (isTextNode(node)) {
			return offset + getTextOffset(node, baseNode);
		} else if (isElementNode(node)) {
			var textOffset = 0;
			for (var i = 0; i < offset; i++) {
				var c = node.childNodes[i];
				textOffset += getTextLength(c);
			}
			return textOffset + getTextOffset(node, baseNode);
		}
		return 0;
	}
	function setCaret(node, offset, setFn) {
		if (offset === 0) {
			setFn(node, 0);
		}
		if (isTextNode(node)) {
			setFn(node, offset);
		} else {
			var textOffset = 0;
			for (var i = 0; i < node.childNodes.length; i++) {
				var c = node.childNodes[i];
				if (textOffset === offset) {
					setFn(c, 0);
					return;
				}
				var nextOffset = textOffset + getTextLength(c);
				if (nextOffset > offset) {
					setCaret(c, offset - textOffset, setFn);
					return;
				}
				textOffset = nextOffset;
			}
			if (textOffset === offset) {
				setFn(node, node.childNodes.length);
			}
		}
	}
	function getSelectionObject(baseNode) {
		var selection = window.getSelection();
		if (!selection.rangeCount) {
			return null;
		}
		var range = selection.getRangeAt(0);
		return {
			start: getCaret(range.startContainer, range.startOffset, baseNode),
			end: getCaret(range.endContainer, range.endOffset, baseNode),
		};
	}
	function setSelectionObject(baseNode, object) {
		var selection = window.getSelection();
		var newRange = document.createRange();
		setCaret(baseNode, object.start, newRange.setStart.bind(newRange));
		setCaret(baseNode, object.end, newRange.setEnd.bind(newRange));

		selection.removeAllRanges();
		selection.addRange(newRange);
	}

	var VisibleSpacesEditor = function(edit) {
		var lastHtml = edit.innerHTML;
		function isModify() {
			var html = edit.innerHTML;
			if (lastHtml === html) {
				return false;
			}
			lastHtml = html;
			return true;
		}
		function onChangeHighlight() {
			//TODO onChange

			if (!hasVisibleTransformTarget(edit)) {
				return false;
			}

			refreshHighlight(edit);

			return true;
		}
		function isIncEdit(node) {
			var e = node;
			while (e) {
				if (e === edit) {
					return true;
				}
				e = e.parentElement;
			}
			return false;
		}
		function onChangeHighlightCaretFix() {
			if (!isModify()) {
				return;
			}
			if (!isIncEdit(document.activeElement)) {
				onChangeHighlight();
				return;
			}
			var selection = getSelectionObject(edit);
			if (selection === null) {
				onChangeHighlight();
				return;
			}

			if (!onChangeHighlight()) {
				return;
			}

			setSelectionObject(edit, selection);
		}
		this._edit = edit;
		this._highlight = onChangeHighlight;

		edit.style['white-space'] = 'pre';
		edit.style['-webkit-user-modify'] = '';
		edit.setAttribute('contenteditable', true);

		var isComposition = false;
		//blur keypress keyup paste copy cut mouseup
		edit.addEventListener('blur', function() {
			if (isModify()) {
				onChangeHighlight();
			}
		});
		edit.addEventListener('keydown', function(e) {
			if (!isComposition) {
				onChangeHighlightCaretFix();
			}
		});
		edit.addEventListener('keyup', function(e) {
			if (!isComposition) {
				onChangeHighlightCaretFix();
			}
		});
		edit.addEventListener('paste', function(e) {
			setTimeout(function() {
				var selection = getSelectionObject(edit);
				edit.innerText = edit.innerText.replace('\u00A0', ' ');
				if (!onChangeHighlight()) {
					return;
				}
				if (selection === null) {
					return;
				}
				setSelectionObject(edit, selection);
			}, 0);
		});
		edit.addEventListener('copy', onChangeHighlightCaretFix);
		edit.addEventListener('cut', onChangeHighlightCaretFix);
		edit.addEventListener('mouseup', onChangeHighlightCaretFix);

		edit.addEventListener('compositionstart', function(e) {
			isComposition = true;
		});
		edit.addEventListener('compositionend', function(e) {
			isComposition = false;
			onChangeHighlightCaretFix();
		});
	};

	VisibleSpacesEditor.prototype.getValue = function() {
		return this._edit.innerText.replace('\u00A0', ' ');
	};
	VisibleSpacesEditor.prototype.setValue = function(value) {
		this._edit.innerText = value;
		this._highlight();
	};

	return VisibleSpacesEditor;
});