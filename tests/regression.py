#!/usr/bin/python
from __future__ import print_function
import os
from os.path import dirname, join, relpath
import platform
import re
from subprocess import Popen, PIPE


def out(msg, *args, **kwargs):
    print(msg.format(*args, **kwargs))


def error(msg, *args, **kwargs):
    if platform.system() == 'Windows':
        out(msg, *args, **kwargs)
    else:
        out('\033[1;31m{}\033[m'.format(msg), *args, **kwargs)


print()

resultLineRE = re.compile(
        r'^\s*Total:\s*(\d+),\s*Failures:\s*(\d+),\s*Errors:\s*(\d+)\s*$',
        re.IGNORECASE | re.MULTILINE
        )

testStatusRE = re.compile(
        r'''^(\[)(Testcase)(:[ ])(.*)(\])$
            | ^(\s+)(\[)(!!)(\])(.*)(error\.)(.*)
                ((?:\n(?:(?:[^ -]|[ ][^\[-]|---?[^-]).*)?)*)
            | ^(\s+)(\[)(--)(\])(.*)(failed\.)(.*\n)
                (Expected:)(.*\n)
                (Actual:)(.*\n)
            | ^(\s+)(\[)(OK)(\])(.*)(passed)(.*)$
            | ^(----)$
            ''',
        re.MULTILINE | re.VERBOSE
        )
testStatusColors = {
        'Testcase': '96',  # bright cyan

        'OK': '1;32',  # bold green
        '!!': '1;31',  # bold red
        '--': '1;31',  # bold red

        'passed': '1;32',  # bold green
        'error.': '1;31',  # bold red
        'failed.': '1;31',  # bold red

        'Expected:': '93',  # bright yellow
        'Actual:': '93',  # bright yellow

        '[': '90',  # dark grey ('bright black')
        ']': '90',  # dark grey ('bright black')
        ': ': '90',  # dark grey ('bright black')
        '----': '90',  # dark grey ('bright black')
        }


def colorizeTestStatus(match):
    if platform.system() == 'Windows':
        return match.group()

    else:
        sections = match.groups()

        defaultColor = ''
        if 'Testcase' in sections:
            defaultColor = '4'  # underlined
        elif 'OK' in sections:
            defaultColor = '97'  # bright white
        elif '--' in sections:
            defaultColor = '97'  # bright white
        elif '!!' in sections:
            defaultColor = '1;31'  # bold red

        colored = []
        for section in sections:
            if section is not None:
                color = testStatusColors.get(section, defaultColor)
                colored.append('\033[{}m{}\033[m'.format(color, section))

        return ''.join(colored)


testDir = dirname(__file__)
failed_list = []

for root, dirs, files in os.walk(testDir):
    for testFile in sorted(files):
        if not testFile.endswith('.test.js'):
            continue

        fullPath = join(root, testFile)
        relativePath = relpath(fullPath, testDir)
        out(relativePath)

        output = Popen(['node', fullPath], stdout=PIPE).communicate()[0]

        with open(fullPath + '.log', 'w') as testLog:
            testLog.write(output)

        match = resultLineRE.search(output)
        if match:
            total, failures, errors = match.groups()
            failures, errors = int(failures), int(errors)

            if failures > 0 or errors > 0:
                failed_list.append((relativePath, failures, errors))
                out('\n{}\n', testStatusRE.sub(colorizeTestStatus, output))
            else:
                out('\t{}', match.group().strip())
                continue

        else:
            error('\tNo totals returned by test! Full output:\n\n{}\n', output)

if failed_list:
    error('\nWARNING! There were failed tests:')
    for testFile, failures, errors in failed_list:
        errorSummary = []
        if failures > 0:
            errorSummary.append('{} failure{}'.format(failures, '' if failures == 1 else 's'))
        if errors > 0:
            errorSummary.append('{} error{}'.format(errors, '' if errors == 1 else 's'))

        out('\t{:<30}  ({})', testFile, ', '.join((errorSummary)))
    print()
    exit(1)

print()
exit(0)
