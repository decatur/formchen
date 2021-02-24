# -*- coding: utf-8 -*-
from setuptools import setup

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

package_dir = \
{'': '.'}

packages = \
['formchen']

package_data = \
{'': ['*'], 'formchen': ['tests/*']}

install_requires = \
['gridchen>=0.1.3,<0.2.0']


setup(
    name='formchen',
    version='0.1.6',
    description='Generate HTML forms and bind hierarchical and tabular data.',
    long_description=long_description,
    long_description_content_type="text/markdown",
    author='Wolfgang Kühn',
    author_email=None,
    maintainer=None,
    maintainer_email=None,
    url='https://github.com/decatur/formchen',
    package_dir=package_dir,
    packages=packages,
    package_data=package_data,
    install_requires=install_requires,
    python_requires='>=3.6,<4.0'
)
