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
                error('\t{}', match.group().strip())
            else:
                out('\t{}', match.group().strip())

        else:
            error('\tNo totals returned by test! Full output:\n{}', '\n'.join(output))

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
