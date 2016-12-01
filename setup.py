import os
import re
from setuptools import setup, find_packages

with open(os.path.join(os.path.dirname(__file__), 'node_gw', '__init__.py')) as f:
    version = re.compile(r".*__version__ = '(.*?)'", re.S).match(f.read()).group(1)

setup(
    name='node_gw',
    packages=find_packages(),
    version=version,
)
