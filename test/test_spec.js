/*global VisibleSpacesEditor*/
(function() {
	'use strict';
	function keyup(element) {
		var evt = document.createEvent('KeyboardEvent');
		evt.initEvent('keyup', true, true);
		element.dispatchEvent(evt);
	}

	function setCaret(node, offset) {
		var selection = window.getSelection();
		var newRange = document.createRange();
		newRange.setStart(node, offset);
		newRange.setEnd(node, offset);

		selection.removeAllRanges();
		selection.addRange(newRange);
	}

	function getCaret(node, index) {
		var selection = window.getSelection();
		if (!selection.rangeCount) {
			return null;
		}
		var range = selection.getRangeAt(0);
		return {
			start: {
				node: range.startContainer,
				offset: range.startOffset,
			},
			end: {
				node: range.endContainer,
				offset: range.endOffset,
			},
		};
	}

	describe('suite', function() {
		it('visible spaces', function() {
			var $div = $('<div>');
			$('#test').append($div);
			var v = new VisibleSpacesEditor($div[0]);
			$div.text(' 　\t');
			keyup($div[0]);
			expect($div.html()).toBe('<span class="vse-visible-space-box vse-visible-space-box-singlebyte"> </span><span class="vse-visible-space-box vse-visible-space-box-multibyte">　</span><span class="vse-visible-space-box vse-visible-space-box-tabchar">\t</span>');
			v.setValue(' ');
			expect($div.html()).toBe('<span class="vse-visible-space-box vse-visible-space-box-singlebyte"> </span>');
		});
		it('on change', function() {
			var $div = $('<div>');
			$('#test').append($div);
			var v = new VisibleSpacesEditor($div[0]);
			var spy = jasmine.createSpy();
			var spy2 = jasmine.createSpy();
			v.on(VisibleSpacesEditor.EVENT_TYPES.CHANGE_VALUE, spy);
			v.on(VisibleSpacesEditor.EVENT_TYPES.CHANGE_VALUE, spy2);
			$div.text('abc');
			keyup($div[0]);
			expect(spy).toHaveBeenCalled();
			expect(spy2).toHaveBeenCalled();
			spy.calls.reset();
			keyup($div[0]);
			expect(spy).not.toHaveBeenCalled();
		});

		it('text ', function() {
			var $div = $('<div>');
			$('#test').append($div);
			new VisibleSpacesEditor($div[0]);
			$div.text(' ');
			keyup($div[0]);
			expect($div.html()).toBe('<span class="vse-visible-space-box vse-visible-space-box-singlebyte"> </span>');
			$div.append('abc');
			keyup($div[0]);
			expect($div.html()).toBe('<span class="vse-visible-space-box vse-visible-space-box-singlebyte"> </span>abc');
			$div.html('<span class="vse-visible-space-box vse-visible-space-box-singlebyte"> abc</span>');
			keyup($div[0]);
			expect($div.html()).toBe('<span class="vse-visible-space-box vse-visible-space-box-singlebyte"> </span>abc');
			$div.html('<span class="vse-visible-space-box vse-visible-space-box-singlebyte"></span>');
			keyup($div[0]);
			expect($div.html()).toBe('');
			$div.html('<span class="vse-visible-space-box vse-visible-space-box-singlebyte">\n</span>');
			keyup($div[0]);
			expect($div.html()).toBe('<br>');
		});

		it('caret1', function() {
			var $div = $('<div>');
			$('#test').append($div);
			new VisibleSpacesEditor($div[0]);
			$div.text('a b c');
			$div.focus();
			setCaret($div[0].childNodes[0], 4);
			keyup($div[0]);
			var caret = getCaret();
			expect(caret.start).toEqual({
				node: $div[0].childNodes[4],
				offset: 0,
			});
		});

		it('caret2', function() {
			var $div = $('<div>');
			$('#test').append($div);
			new VisibleSpacesEditor($div[0]);
			$div.html(
				'<span class="vse-visible-space-box vse-visible-space-box-singlebyte"> </span>' +
				'<span class="vse-visible-space-box vse-visible-space-box-singlebyte"> </span>' +
				'<span class="vse-visible-space-box vse-visible-space-box-singlebyte"> a</span>');
			$div.focus();
			setCaret($div[0].childNodes[2], 1);
			keyup($div[0]);
			var caret = getCaret();
			expect(caret.start).toEqual({
				node: $div[0],
				offset: 4,
			});
		});

		if (window.jscoverage_report) {
			window.jscoverage_report();
		}
	});
})();